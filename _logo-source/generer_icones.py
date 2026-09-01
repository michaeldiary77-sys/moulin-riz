"""Génère les assets Expo (icon, icône adaptative Android, monochrome, splash,
favicon) pour les deux apps à partir des logos fournis par l'utilisateur."""
from PIL import Image
import os

SRC = os.path.dirname(os.path.abspath(__file__))
NAVY = "#03132F"

APPS = {
    "moulin-operateur": {
        "fond": "c500ec2e-a10a-43f0-9152-0fa03c8de0b8.png",
        "transparent": "0c817720-8b51-4a82-8301-28149db9756b.png",
    },
    "moulin-patron": {
        "fond": "b80dc161-abc0-4475-8d52-61aad8a265c7.png",
        "transparent": "a22cec50-555b-4431-a20a-18528c2d3597.png",
    },
}

CANVAS = 1024
SAFE_ZONE_RATIO = 0.62  # cible Android : contenu dans un cercle d'env. 66/108 du canevas


def carre_navy_vers_icon(chemin_source, chemin_dest):
    im = Image.open(chemin_source).convert("RGB")
    im = im.resize((CANVAS, CANVAS), Image.LANCZOS)
    im.save(chemin_dest)


def recadrer_sur_contenu(im, marge_ratio=0.04):
    alpha = im.split()[-1]
    bbox = alpha.getbbox()
    if bbox is None:
        return im
    x0, y0, x1, y1 = bbox
    w, h = x1 - x0, y1 - y0
    mx, my = int(w * marge_ratio), int(h * marge_ratio)
    x0, y0 = max(0, x0 - mx), max(0, y0 - my)
    x1, y1 = min(im.width, x1 + mx), min(im.height, y1 + my)
    return im.crop((x0, y0, x1, y1))


def placer_dans_zone_sure(chemin_source, chemin_dest, ratio=SAFE_ZONE_RATIO):
    im = Image.open(chemin_source).convert("RGBA")
    contenu = recadrer_sur_contenu(im, marge_ratio=0.0)
    cible = int(CANVAS * ratio)
    w, h = contenu.size
    echelle = cible / max(w, h)
    contenu = contenu.resize((max(1, int(w * echelle)), max(1, int(h * echelle))), Image.LANCZOS)
    canevas = Image.new("RGBA", (CANVAS, CANVAS), (0, 0, 0, 0))
    x = (CANVAS - contenu.width) // 2
    y = (CANVAS - contenu.height) // 2
    canevas.paste(contenu, (x, y), contenu)
    canevas.save(chemin_dest)
    return canevas


def vers_monochrome(canevas_rgba, chemin_dest):
    r, g, b, a = canevas_rgba.split()
    blanc = Image.new("L", canevas_rgba.size, 255)
    mono = Image.merge("RGBA", (blanc, blanc, blanc, a))
    mono.save(chemin_dest)


def splash_depuis_transparent(chemin_source, chemin_dest, marge_ratio=0.06):
    im = Image.open(chemin_source).convert("RGBA")
    recadre = recadrer_sur_contenu(im, marge_ratio=marge_ratio)
    recadre.save(chemin_dest)


def favicon_depuis_navy(chemin_icon, chemin_dest, taille=64):
    im = Image.open(chemin_icon).convert("RGB")
    im = im.resize((taille, taille), Image.LANCZOS)
    im.save(chemin_dest)


for app, fichiers in APPS.items():
    dest_dir = os.path.join(SRC, "..", app, "assets", "images")
    fond = os.path.join(SRC, fichiers["fond"])
    transparent = os.path.join(SRC, fichiers["transparent"])

    icon_path = os.path.join(dest_dir, "icon.png")
    carre_navy_vers_icon(fond, icon_path)

    foreground_path = os.path.join(dest_dir, "android-icon-foreground.png")
    canevas = placer_dans_zone_sure(transparent, foreground_path)

    mono_path = os.path.join(dest_dir, "android-icon-monochrome.png")
    vers_monochrome(canevas, mono_path)

    splash_path = os.path.join(dest_dir, "splash-icon.png")
    splash_depuis_transparent(transparent, splash_path)

    favicon_path = os.path.join(dest_dir, "favicon.png")
    favicon_depuis_navy(icon_path, favicon_path)

    bg_image_obsolete = os.path.join(dest_dir, "android-icon-background.png")
    if os.path.exists(bg_image_obsolete):
        os.remove(bg_image_obsolete)

    print(app, "OK ->", dest_dir)

print("Couleur navy utilisée pour adaptiveIcon.backgroundColor et le splash :", NAVY)
