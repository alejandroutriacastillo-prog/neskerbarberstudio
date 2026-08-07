from datetime import datetime, time, timedelta
from pathlib import Path
import secrets
from fastapi import Depends, FastAPI, HTTPException, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBasic, HTTPBasicCredentials
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from sqlalchemy import Date, cast
from sqlalchemy.orm import Session
import database
import models
import schemas

BASE_DIR = Path(__file__).resolve().parent

STATIC_DIR = BASE_DIR / "static"
TEMPLATES_DIR = BASE_DIR / "templates"

# Crear tablas
models.Base.metadata.create_all(bind=database.engine)

app = FastAPI()

security = HTTPBasic()

# Credenciales de acceso para el panel de administración
ADMIN_USER = "nesker"
ADMIN_PASSWORD = "2444"  # Cámbiala por la que prefieras


def verificar_admin(credentials: HTTPBasicCredentials = Depends(security)):
  is_user_ok = secrets.compare_digest(credentials.username, ADMIN_USER)
  is_pass_ok = secrets.compare_digest(credentials.password, ADMIN_PASSWORD)

  if not (is_user_ok and is_pass_ok):
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Credenciales incorrectas",
        headers={"WWW-Authenticate": "Basic"},
    )
  return credentials.username


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Permite peticiones desde cualquier origen/IP
    allow_credentials=True,
    allow_methods=["*"],  # Permite todos los métodos (POST, GET, etc.)
    allow_headers=["*"],  # Permite todos los encabezados
)

# Configuración de Jinja2 apuntando a la carpeta templates al mismo nivel que static
templates = Jinja2Templates(directory=str(TEMPLATES_DIR))

# Servir archivos estáticos
app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")


# Ruta para ver la web principal:
@app.get("/")
def home(request: Request):
  return templates.TemplateResponse(
      request=request, name="index.html", context={}
  )


@app.get("/servicios", response_model=list[schemas.ServicioResponse])
@app.get("/servicios/", response_model=list[schemas.ServicioResponse])
def listar_servicios(db: Session = Depends(database.get_db)):
  servicios = db.query(models.Servicio).all()
  return servicios


# POST: Crear reserva
@app.post("/reservas/", response_model=schemas.ReservaResponse)
def crear_reserva(
    reserva: schemas.ReservaCreate, db: Session = Depends(database.get_db)
):
  fecha_reserva = reserva.fecha_hora.date()
  hora_reserva = reserva.fecha_hora.time()

  # 1. Validar si es domingo
  if fecha_reserva.weekday() == 6:
    raise HTTPException(
        status_code=400, detail="❌ Los domingos estamos cerrados"
    )

  # 2. VALIDAR SI EL DÍA ESTÁ BLOQUEADO
  bloqueos = db.query(models.BloqueoHorario).all()
  bloqueo_dia = None
  for b in bloqueos:
    if b.fecha_hora.date() == fecha_reserva:
      bloqueo_dia = b
      break

  if bloqueo_dia:
    raise HTTPException(
        status_code=400, detail=f"❌ Este día está cerrado: {bloqueo_dia.motivo}"
    )

  # 3. VALIDACIÓN DE HORARIO SEGÚN EL DÍA (Bloques de 45 min)
  # Sábados: de 09:30 a 14:00 (última cita a las 13:15)
  # Lunes a Viernes: de 09:30 a 17:00 (última cita a las 16:15)
  if fecha_reserva.weekday() == 5:  # Sábado
    if not (time(9, 30) <= hora_reserva <= time(13, 15)):
      raise HTTPException(
          status_code=400,
          detail="Sábados de 09:30 a 14:00 (última cita 13:15)",
      )
  else:  # Lunes a Viernes
    if not (time(9, 30) <= hora_reserva <= time(16, 15)):
      raise HTTPException(
          status_code=400,
          detail="Abiertos de 09:30 a 17:00 (última cita 16:15)",
      )

  # 4. VALIDACIÓN DE DUPLICADOS
  cita_existente = (
      db.query(models.Reserva)
      .filter(models.Reserva.fecha_hora == reserva.fecha_hora)
      .first()
  )

  if cita_existente:
    raise HTTPException(
        status_code=400,
        detail="❌ Este horario ya está reservado.",
    )

  # 5. GUARDAR
  db_reserva = models.Reserva(**reserva.model_dump())
  db.add(db_reserva)
  db.commit()
  db.refresh(db_reserva)

  return db_reserva


# GET: Listar todas las reservas
@app.get("/reservas/", response_model=list[schemas.ReservaResponse])
def listar_reservas(db: Session = Depends(database.get_db)):
  reservas = db.query(models.Reserva).all()
  return reservas


@app.get("/disponibilidad/{fecha}")
def obtener_huecos(fecha: str, db: Session = Depends(database.get_db)):
  fecha_obj = datetime.strptime(fecha, "%Y-%m-%d").date()

  # Si es domingo, cerrado
  if fecha_obj.weekday() == 6:
    return {
        "fecha": fecha,
        "huecos_libres": [],
        "motivo_cierre": "Cerrado los domingos",
    }

  # Comprobar si el día entero está bloqueado
  bloqueos = db.query(models.BloqueoHorario).all()
  bloqueo_dia = None
  for b in bloqueos:
    if b.fecha_hora.date() == fecha_obj:
      bloqueo_dia = b
      break

  if bloqueo_dia:
    return {
        "fecha": fecha,
        "huecos_libres": [],
        "motivo_cierre": bloqueo_dia.motivo,
    }

  # Traer reservas existentes
  reservas = db.query(models.Reserva).all()
  horas_ocupadas = [
      r.fecha_hora.time() for r in reservas if r.fecha_hora.date() == fecha_obj
  ]

  huecos = []
  actual = datetime.combine(fecha_obj, time(9, 30))

  # Hora límite de cierre (Sábados 14:00, Lunes a Viernes 17:00)
  hora_cierre = time(14, 0) if fecha_obj.weekday() == 5 else time(17, 0)
  cierre = datetime.combine(fecha_obj, hora_cierre)

  # Generar huecos cada 45 minutos hasta la hora de cierre
  while actual < cierre:
    if actual.time() not in horas_ocupadas:
      huecos.append(actual.strftime("%H:%M"))
    actual += timedelta(minutes=45)

  return {"fecha": fecha, "huecos_libres": huecos, "motivo_cierre": None}


# GET: Listar bloqueos
@app.get("/bloqueos/")
def listar_bloqueos(db: Session = Depends(database.get_db)):
  return db.query(models.BloqueoHorario).all()


# POST: Crear un bloqueo
@app.post("/bloqueos/")
def crear_bloqueo(
    bloqueo: schemas.BloqueoCreate, db: Session = Depends(database.get_db)
):
  bloqueo_existente = (
      db.query(models.BloqueoHorario)
      .filter(models.BloqueoHorario.fecha_hora == bloqueo.fecha_hora)
      .first()
  )

  if bloqueo_existente:
    bloqueo_existente.motivo = bloqueo.motivo
    db.commit()
    db.refresh(bloqueo_existente)
    return bloqueo_existente

  db_bloqueo = models.BloqueoHorario(**bloqueo.model_dump())
  db.add(db_bloqueo)
  db.commit()
  db.refresh(db_bloqueo)
  return db_bloqueo


# DELETE: Eliminar un bloqueo (desbloquear)
@app.delete("/bloqueos/{bloqueo_id}")
def eliminar_bloqueo(
    bloqueo_id: int, db: Session = Depends(database.get_db)
):
  bloqueo = (
      db.query(models.BloqueoHorario)
      .filter(models.BloqueoHorario.id == bloqueo_id)
      .first()
  )
  if not bloqueo:
    raise HTTPException(status_code=404, detail="Bloqueo no encontrado")
  db.delete(bloqueo)
  db.commit()
  return {"mensaje": "Bloqueo eliminado"}


@app.get("/admin")
def panel_admin(request: Request, username: str = Depends(verificar_admin)):
  return templates.TemplateResponse(
      request=request, name="admin.html", context={}
  )


@app.delete("/reservas/{reserva_id}")
def eliminar_reserva(reserva_id: int, db: Session = Depends(database.get_db)):
  cita = (
      db.query(models.Reserva)
      .filter(models.Reserva.id == reserva_id)
      .first()
  )
  if not cita:
    raise HTTPException(status_code=404, detail="❌ Cita no encontrada")

  db.delete(cita)
  db.commit()
  return {"mensaje": " ✅ Cita eliminada correctamente"}


if __name__ == "__main__":
  import uvicorn

  uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=False)