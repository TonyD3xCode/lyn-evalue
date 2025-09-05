
create table if not exists vehicles (
  veh_id text primary key,
  fecha date,
  vin text,
  marca text,
  modelo text,
  anio text,
  color text,
  pais text,
  notas text,
  foto_vehiculo text,
  updated_at timestamptz default now()
);

create table if not exists damages (
  id text primary key,
  veh_id text references vehicles(veh_id) on delete cascade,
  parte text,
  ubic text,
  sev text,
  descrption text,
  cost numeric,
  imgs jsonb default '[]'::jsonb,
  updated_at timestamptz default now()
);

create index if not exists damages_veh_idx on damages(veh_id);
