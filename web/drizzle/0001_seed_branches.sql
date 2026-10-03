-- Custom SQL migration file, put your code below! ---- The two locations
INSERT INTO "branches" ("id", "name") VALUES ('main', 'Enero Marso Cafe'), ('noir', 'Enero Marso Cafe Noir') ON CONFLICT ("id") DO NOTHING;
