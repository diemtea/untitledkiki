import sys
from PIL import Image
p = sys.argv[1]
names = sys.argv[2:] or ['town','forest','meadow','fly','night','harbor']
ims = [Image.open(f'tools/shots/{p}_{n}.png').resize((640,360)) for n in names]
rows = (len(ims) + 1) // 2
out = Image.new('RGB', (1280, 360 * rows))
for i, im in enumerate(ims): out.paste(im, ((i % 2) * 640, (i // 2) * 360))
out.save(f'tools/shots/{p}_grid.png')
