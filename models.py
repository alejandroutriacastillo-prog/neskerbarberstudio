### ESTRUCTURA DE LOS DATOS ###

from sqlalchemy import Column, Integer, String, DateTime, Text, Float
from database import Base


class Reserva(Base):
    __tablename__ = "reservas"

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String, nullable=False)
    telefono = Column(String, nullable=False)
    fecha_hora = Column(DateTime, nullable=False)

class BloqueoHorario(Base):
    __tablename__ = "bloqueos"

    id = Column(Integer, primary_key=True, index=True)
    fecha_hora = Column(DateTime, unique=True, index=True)  # Si es un día entero, puedes guardar la fecha con hora 00:00 o bloquear horas sueltas
    motivo = Column(String, default="Cerrado")