import database as database
import models as models
import models
from database import engine

models.Base.metadata.create_all(bind=engine)

# Asegurarnos de que las tablas existan
models.Base.metadata.create_all(bind=database.engine)

# Crear una sesión para interactuar con la DB
db = database.SessionLocal()

def poblar_servicios():
    # Comprobar si ya existen servicios
    servicios_existentes = db.query(models.Servicio).first()
    
    if not servicios_existentes:
        print("La base de datos está vacía. Añadiendo servicios...")
        nuevos_servicios = [
            models.Servicio(nombre="Corte"),
            models.Servicio(nombre="Barba"),
            models.Servicio(nombre="Corte y Barba"),
            models.Servicio(nombre="Niños")
        ]
        db.add_all(nuevos_servicios)
        db.commit()
        print("¡Servicios iniciales cargados correctamente!")
    else:
        print("Los servicios ya existen en la base de datos. No se ha hecho nada.")

if __name__ == "__main__":
    poblar_servicios()
    db.close()