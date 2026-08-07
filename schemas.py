from pydantic import BaseModel
from datetime import datetime
from typing import Optional

# Esquemas para Reservas (Citas)
class ReservaCreate(BaseModel):
    nombre: str
    telefono: str
    fecha_hora: datetime

class ReservaResponse(ReservaCreate):
    id: int

    class Config:
        from_attributes = True

# Esquemas para Servicios (necesarios para el endpoint de /servicios)
class ServicioCreate(BaseModel):
    nombre: str
    precio: float

class ServicioResponse(ServicioCreate):
    id: int

    class Config:
        from_attributes = True

# Esquemas para Bloqueos de Horario / Vacaciones
class BloqueoCreate(BaseModel):
    fecha_hora: datetime
    motivo: str = "Cerrado"

class BloqueoResponse(BloqueoCreate):
    id: int

    class Config:
        from_attributes = True