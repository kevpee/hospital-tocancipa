-- ========================================================
-- SISTEMA DE GESTIÓN DE CITAS HOSPITALARIAS
-- Esquema de Base de Datos Relacional - PostgreSQL
-- Modelo Entidad-Relación Académico Normalizado
-- ========================================================

-- Eliminar tablas si existen en orden de dependencias
DROP TABLE IF EXISTS citas CASCADE;
DROP TABLE IF EXISTS disponibilidades CASCADE;
DROP TABLE IF EXISTS horarios CASCADE;
DROP TABLE IF EXISTS medicos CASCADE;
DROP TABLE IF EXISTS pacientes CASCADE;
DROP TABLE IF EXISTS consultorios CASCADE;
DROP TABLE IF EXISTS especialidades CASCADE;

-- 1. Tabla de Especialidades Médicas
CREATE TABLE especialidades (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL UNIQUE,
    descripcion TEXT,
    fecha_creacion TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Tabla de Consultorios / Salas de Atención
CREATE TABLE consultorios (
    id SERIAL PRIMARY KEY,
    numero VARCHAR(20) NOT NULL UNIQUE,
    piso VARCHAR(20) NOT NULL,
    descripcion VARCHAR(150),
    fecha_creacion TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Tabla de Pacientes (Conserva todos los campos de contacto y fecha nacimiento)
CREATE TABLE pacientes (
    id_paciente SERIAL PRIMARY KEY,
    documento_de_identidad VARCHAR(50) NOT NULL UNIQUE,
    nombre VARCHAR(150) NOT NULL,
    telefono VARCHAR(30) NOT NULL,
    correo VARCHAR(150) NOT NULL,
    fecha_nacimiento DATE NOT NULL,
    fecha_registro TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Tabla de Médicos (PK documento_de_identidad según modelo académico)
CREATE TABLE medicos (
    documento_de_identidad VARCHAR(50) PRIMARY KEY,
    nombre VARCHAR(150) NOT NULL,
    especialidad_id INTEGER NOT NULL REFERENCES especialidades(id) ON DELETE RESTRICT,
    fecha_registro TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Tabla de Horarios (Días de atención por médico)
CREATE TABLE horarios (
    id_horario SERIAL PRIMARY KEY,
    documento_de_identidad VARCHAR(50) NOT NULL REFERENCES medicos(documento_de_identidad) ON DELETE CASCADE,
    dia_semana VARCHAR(20) NOT NULL,
    fecha_creacion TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_dia_semana CHECK (dia_semana IN ('Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo')),
    CONSTRAINT uq_medico_dia UNIQUE (documento_de_identidad, dia_semana)
);

-- 6. Tabla de Disponibilidades (Espacios concretos de atención)
CREATE TABLE disponibilidades (
    id_disponibilidad SERIAL PRIMARY KEY,
    id_horario INTEGER NOT NULL REFERENCES horarios(id_horario) ON DELETE CASCADE,
    documento_de_identidad VARCHAR(50) NOT NULL REFERENCES medicos(documento_de_identidad) ON DELETE CASCADE,
    id_sala INTEGER NOT NULL REFERENCES consultorios(id) ON DELETE RESTRICT,
    fecha DATE NOT NULL,
    horario_atencion VARCHAR(50) NOT NULL,
    estado SMALLINT NOT NULL DEFAULT 1, -- 1 = disponible, 0 = ocupado
    fecha_creacion TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_disp_estado CHECK (estado IN (0, 1)),
    -- Evitar que un médico tenga dos espacios superpuestos en la misma fecha y franja horaria
    CONSTRAINT uq_medico_fecha_franja UNIQUE (documento_de_identidad, fecha, horario_atencion),
    -- Evitar que una sala/consultorio se asigne simultáneamente a dos espacios en la misma fecha y hora
    CONSTRAINT uq_sala_fecha_franja UNIQUE (id_sala, fecha, horario_atencion)
);

-- 7. Tabla de Citas Médicas
CREATE TABLE citas (
    id_cita SERIAL PRIMARY KEY,
    id_paciente INTEGER NOT NULL REFERENCES pacientes(id_paciente) ON DELETE CASCADE,
    id_disponibilidad INTEGER NOT NULL UNIQUE REFERENCES disponibilidades(id_disponibilidad) ON DELETE RESTRICT,
    motivo TEXT NOT NULL,
    estado VARCHAR(20) NOT NULL DEFAULT 'programada',
    fecha_creacion TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_cita_estado CHECK (estado IN ('programada', 'atendida', 'cancelada'))
);

-- Índices para optimizar búsquedas y reportes
CREATE INDEX idx_horarios_medico ON horarios(documento_de_identidad);
CREATE INDEX idx_disp_medico ON disponibilidades(documento_de_identidad);
CREATE INDEX idx_disp_fecha ON disponibilidades(fecha);
CREATE INDEX idx_disp_estado ON disponibilidades(estado);
CREATE INDEX idx_citas_paciente ON citas(id_paciente);
CREATE INDEX idx_citas_disp ON citas(id_disponibilidad);
CREATE INDEX idx_citas_estado ON citas(estado);

-- ========================================================
-- DATOS SEMILLA DE EJEMPLO
-- ========================================================

INSERT INTO especialidades (nombre, descripcion) VALUES
('Medicina General', 'Atención integral para la prevención, diagnóstico y tratamiento de enfermedades comunes.'),
('Pediatría', 'Atención médica integral especializada para recién nacidos, niños y adolescentes.'),
('Cardiología', 'Prevención, diagnóstico y tratamiento de enfermedades del sistema cardiovascular y del corazón.'),
('Traumatología', 'Diagnóstico y tratamiento de lesiones del aparato locomotor, huesos y articulaciones.'),
('Ginecología', 'Cuidado de la salud integral de la mujer y salud reproductiva.');

INSERT INTO consultorios (numero, piso, descripcion) VALUES
('101', 'Piso 1', 'Consultorio de Medicina General y Triaje'),
('102', 'Piso 1', 'Consultorio de Pediatría y Control de Niño'),
('201', 'Piso 2', 'Consultorio de Cardiología y Pruebas no Invasivas'),
('202', 'Piso 2', 'Consultorio de Traumatología y Curaciones');
