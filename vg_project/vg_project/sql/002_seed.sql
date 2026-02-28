-- NOTE: replace password_hash values after first run (bcrypt).
-- For dev: login via /api/auth/register or edit hashes.

INSERT INTO users(email,password_hash,prenom,nom,role)
VALUES
('admin@vg.fr','$2b$10$REPLACE_ME','Admin','VG','admin'),
('employee@vg.fr','$2b$10$REPLACE_ME','Emma','Service','employee'),
('client@vg.fr','$2b$10$REPLACE_ME','Marc','Client','client')
ON CONFLICT DO NOTHING;

INSERT INTO menus(name,type,theme,desc_short,desc_full,price,min_persons,img_url,allergens)
VALUES
('Menu Signature','classique','Gastronomique','Foie gras, magret et bûche.','Menu signature de saison.',45.00,2,'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe','Gluten, Lait, Œufs'),
('Menu Vegan Gourmand','vegan','Vegan','Cuisine végétale raffinée.','100% végétal, textures et sauces maison.',34.00,2,'https://images.unsplash.com/photo-1540914124281-342587941389','Fruits à coque')
ON CONFLICT DO NOTHING;
