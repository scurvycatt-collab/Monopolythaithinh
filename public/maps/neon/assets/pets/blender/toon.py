# Quân cờ neon (Lumina-01) kiểu toon 2.5D: camera trực giao khớp phép chiếu Pen, mặt phẳng 3 tông,
# viền navy (inverted hull), cạnh neon phát sáng. Xem README.md.
#   Xuất quân cho game: python3 toon.py <key> 0 export <thư-mục-pets>   -> <id>-token.svg
#   Ảnh xem thử:        python3 toon.py <key> <res> <tag>              -> $NEON_TOKEN_TMP/<key>_toon_<tag>.png (+ _glow)
import sys, os, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bpy
from mathutils import Vector
import lib
from lib import hexc
import tokens as tk

import tempfile
OUT = os.environ.get('NEON_TOKEN_TMP', os.path.join(tempfile.gettempdir(), 'neon-token-renders'))   # ảnh trung gian, không commit

# ---- tham số chỉnh ----
L = Vector((0.55, 0.18, 0.85))       # hướng sáng giả (Blender: +X = mặt phải, -Y = mặt trái, +Z = trên)
STEP = (0.22, 0.62)                  # ngưỡng ramp: <STEP0 tối, <STEP1 vừa, còn lại sáng
F_DARK, F_MID, F_TOP = 0.74, 0.90, 1.0   # hệ số sáng (theo mẫu khối Pen: trái/phải/trên)
TOP_LIFT = 0.10                      # mặt trên pha trắng thêm
OUTLINE = 0.022                      # bề dày viền (đơn vị thế giới ≈ 1.2 px ở cỡ bàn cờ)
OUT_COL = '#060b18'
MIN_EMIT_R = 0.016
CHAR_K = 1.18                   # phóng nhân vật (không phóng đế) để bóng dáng đọc được ở ~70 px
# object tô màu chủ (flat 3 tông) theo từng quân — thêm mảng màu chủ, không chỉ ống neon mảnh
OWN_OBJ = {'*': ('base0',), 'vance_b': (), 'nyx_a': ('ring', 'hip', 'thigh', 'eyeH'),
           'sera_a': ('fEar',), 'k9_a': ('crown', 'plinth', 'levBase', 'ledge')}
BASE_K = 0.78                   # ống neon tối thiểu (để không biến mất < 2px)
SKIP = ('rivet', 'vent', 'bolt', 'rv', 'pv', 'reed', 'tick', 'hbolt', 'bub', 'sevA', 'cab', 'piston',
        'payline', 'pip', 'coin', 'foot')

# bảng màu phẳng thay cho PBR: (hex, độ trong suốt 0..1)
PAL = {
    'blackchrome': ('#4a5a88', 0), 'gunmetal': ('#34416c', 0), 'steel': ('#bcc6dc', 0),
    'gold': ('#ffb81f', 0), 'rubber': ('#151a2a', 0), 'glassblk': ('#3a4570', 0.4),
    'glasscy': ('#7fe9ff', 0.3), 'glassgr': ('#c8ff8a', 0.3), 'plate': ('#e23cbf', 0),
    'plate2': ('#5a1e6a', 0), 'tailtip': ('#e6e6f0', 0), 'reel': ('#e8eaf0', 0),
    'chromeL': ('#c8ccd6', 0), 'coin': ('#a8c060', 0), 'cherry': ('#d0183e', 0),
}
GLOW = {'emit': 1.0, 'emit_lo': 0.75, 'white': 1.0, 'goldglow': 0.85, 'knob': 1.0, 'core': 0.8}


def shade(h, f, lift=0.0):
    c = [int(h[i:i + 2], 16) / 255 for i in (1, 3, 5)]
    c = [min(1, x * f) * (1 - lift) + lift for x in c]
    return '#%02x%02x%02x' % tuple(int(round(x * 255)) for x in c)


def clear(m):
    try:
        m.use_nodes = True
    except Exception:
        pass
    nt = m.node_tree
    for n in list(nt.nodes):
        nt.nodes.remove(n)
    return nt, nt.nodes.new('ShaderNodeOutputMaterial')


def toon_mat(m, hx, alpha):
    nt, out = clear(m)
    geo = nt.nodes.new('ShaderNodeNewGeometry')
    dot = nt.nodes.new('ShaderNodeVectorMath'); dot.operation = 'DOT_PRODUCT'
    dot.inputs[1].default_value = L.normalized()
    nt.links.new(geo.outputs['Normal'], dot.inputs[0])
    cr = nt.nodes.new('ShaderNodeValToRGB')
    r = cr.color_ramp
    r.interpolation = 'CONSTANT'
    r.elements[0].position = 0.0; r.elements[0].color = hexc(shade(hx, F_DARK))
    r.elements[1].position = STEP[0]; r.elements[1].color = hexc(shade(hx, F_MID))
    e = r.elements.new(STEP[1]); e.color = hexc(shade(hx, F_TOP, TOP_LIFT))
    nt.links.new(dot.outputs['Value'], cr.inputs['Fac'])
    em = nt.nodes.new('ShaderNodeEmission')
    nt.links.new(cr.outputs['Color'], em.inputs['Color'])
    sh = em.outputs[0]
    if alpha:
        tr = nt.nodes.new('ShaderNodeBsdfTransparent')
        mx = nt.nodes.new('ShaderNodeMixShader'); mx.inputs[0].default_value = alpha
        nt.links.new(sh, mx.inputs[1]); nt.links.new(tr.outputs[0], mx.inputs[2]); sh = mx.outputs[0]
    nt.links.new(sh, out.inputs[0])


def glow_mat(m, col, k):
    nt, out = clear(m)
    em = nt.nodes.new('ShaderNodeEmission')
    em.inputs['Color'].default_value = tuple(c * k for c in col[:3]) + (1,)
    nt.links.new(em.outputs[0], out.inputs[0])


def black_mat(m, alpha=0):
    nt, out = clear(m)
    em = nt.nodes.new('ShaderNodeEmission'); em.inputs['Color'].default_value = (0, 0, 0, 1)
    sh = em.outputs[0]
    if alpha:
        tr = nt.nodes.new('ShaderNodeBsdfTransparent')
        mx = nt.nodes.new('ShaderNodeMixShader'); mx.inputs[0].default_value = alpha
        nt.links.new(sh, mx.inputs[1]); nt.links.new(tr.outputs[0], mx.inputs[2]); sh = mx.outputs[0]
    nt.links.new(sh, out.inputs[0])


def outline_mat(col):
    m = bpy.data.materials.new('outline')
    nt, out = clear(m)
    em = nt.nodes.new('ShaderNodeEmission'); em.inputs['Color'].default_value = col
    tr = nt.nodes.new('ShaderNodeBsdfTransparent')
    geo = nt.nodes.new('ShaderNodeNewGeometry')
    mx = nt.nodes.new('ShaderNodeMixShader')
    nt.links.new(geo.outputs['Backfacing'], mx.inputs[0])
    nt.links.new(em.outputs[0], mx.inputs[1]); nt.links.new(tr.outputs[0], mx.inputs[2])
    nt.links.new(mx.outputs[0], out.inputs[0])
    return m


# ---- đơn giản hoá chi tiết nhỏ: bọc các hàm dựng hình ----
def _emitish(m):
    return m is not None and m.name.split('.')[0] in ('emit', 'emit_lo', 'white', 'holo')

_torus, _cb, _cable = lib.torus, lib.cyl_between, lib.cable
def torus(name, R, r, loc, m, rot=(0, 0, 0), seg=96, mseg=16):
    if _emitish(m):
        r = max(r, MIN_EMIT_R)
    return _torus(name, R, r, loc, m, rot, seg, mseg)
def cyl_between(name, p1, p2, r, m, r2=None, seg=24, bev=0.004):
    if _emitish(m):
        r = max(r, MIN_EMIT_R)
    return _cb(name, p1, p2, r, m, r2, seg, bev)
def cable(name, pts, r, m):
    if _emitish(m):
        r = max(r, MIN_EMIT_R)
    return _cable(name, pts, r, m)
for mod in (lib, tk):
    mod.torus, mod.cyl_between, mod.cable = torus, cyl_between, cable


def build(key):
    hx, fn = tk.CHARS[key]
    lib.reset()
    M = lib.std_mats(hx)
    tk.extra_mats(M)
    lib.scene_setup(hx, samples=16)
    fn(M)
    return hx, M


def toonify(hx, M, key=''):
    s = bpy.context.scene
    # phóng nhóm nhân vật quanh gốc, giữ chân chạm mặt đế (đế bị ép z 0.8)
    root = bpy.data.objects.get('root')
    if root:
        root.scale = (CHAR_K,) * 3
        root.location.z = 0.8 * lib.T - CHAR_K * lib.T
    # bỏ đèn, nền đen trong suốt, màu chuẩn
    for o in list(s.objects):
        if o.type == 'LIGHT':
            if o in lib.PARTS:
                lib.PARTS.remove(o)
            bpy.data.objects.remove(o)
    s.world.node_tree.nodes['Background'].inputs['Strength'].default_value = 0
    s.view_settings.view_transform = 'Standard'
    s.view_settings.look = 'None'
    s.cycles.samples = 24
    s.cycles.use_adaptive_sampling = False
    s.cycles.use_denoising = False
    s.cycles.transparent_max_bounces = 32
    s.cycles.max_bounces = 32
    s.render.filter_size = 1.0
    # bỏ chi tiết li ti
    for o in list(lib.PARTS):
        if o.name.split('.')[0].rstrip('0123456789-') in SKIP:
            o.hide_render = True
    # đế thu nhỏ để nhân vật chiếm phần lớn quân ở cỡ bàn cờ
    piv = bpy.data.objects.new('basePivot', None)
    s.collection.objects.link(piv)
    piv.scale = (BASE_K, BASE_K, 0.8)
    for o in lib.PARTS:
        nm = o.name
        if (nm.startswith('base') or nm.startswith('rivet') or nm.startswith('vent')) and o.parent is None:
            o.parent = piv
    bpy.context.view_layer.update()
    own = hexc(hx)
    PAL['ownflat'] = (hx, 0)
    ownm = bpy.data.materials.new('ownflat')
    names = OWN_OBJ['*'] + OWN_OBJ.get(key, ())
    for o in lib.PARTS:
        if o.type == 'MESH' and o.name.split('.')[0] in names:
            for i in range(len(o.data.materials)):
                o.data.materials[i] = ownm
    for m in bpy.data.materials:
        n = m.name.split('.')[0]
        if n in PAL:
            toon_mat(m, *PAL[n])
        elif n in GLOW:
            glow_mat(m, own if n not in ('white',) else (1, 0.97, 0.92, 1), GLOW[n])
    if 'gold' in PAL and hx == '#ffb81f':
        pass
    # viền: bản sao + Solidify lật pháp tuyến, vật liệu gắn theo object
    om = outline_mat(hexc(OUT_COL))
    tm = bpy.data.materials.new('clear')
    nt, out = clear(tm)
    nt.links.new(nt.nodes.new('ShaderNodeBsdfTransparent').outputs[0], out.inputs[0])
    for o in list(lib.PARTS):
        if o.type not in ('MESH', 'FONT', 'CURVE') or o.hide_render:
            continue
        if o.data.materials and all(mm and mm.name.startswith('holo') for mm in o.data.materials):
            continue
        dg = bpy.context.evaluated_depsgraph_get()
        me = bpy.data.meshes.new_from_object(o.evaluated_get(dg))
        for p in me.polygons:
            p.flip()
        me.materials.clear()
        me.materials.append(om)
        for p in me.polygons:
            p.material_index = 0
        me.update()
        c = bpy.data.objects.new(o.name + '_ol', me)
        s.collection.objects.link(c)
        c.matrix_world = o.matrix_world.copy()
        dp = c.modifiers.new('outline', 'DISPLACE')
        dp.direction = 'NORMAL'
        dp.mid_level = 0.0
        dp.strength = -OUTLINE
        c['is_outline'] = True
    return om


def glow_pass():
    """Đổi mọi vật liệu không phát sáng sang đen (giữ che khuất) để lấy mặt nạ glow."""
    for m in bpy.data.materials:
        n = m.name.split('.')[0]
        if n in PAL:
            black_mat(m, PAL[n][1])
        elif n == 'outline':
            nt = m.node_tree
            [x for x in nt.nodes if x.type == 'EMISSION'][0].inputs['Color'].default_value = (0, 0, 0, 1)
        elif n.startswith('holo'):
            pass


# ---- xuất quân cho game ----
# Renderer 2D vẽ ảnh vuông cạnh H = TOKEN_HEIGHT*K, điểm chân (tâm đế, z=0) ở (0.5H, 0.94H).
# Ảnh ra 440x440, 1 đơn vị Blender = PPU_OUT px (đế ≈ elip màu chủ 0.28K của renderer). Tâm đế đặt ở y = ANCHOR_Y*440
# (cao hơn 0.94 để cả đĩa đế + quầng nằm gọn trong khung, đáy ≈ 436 px như bộ quân trước).
IDS = {'vance_b': 'neon-vance', 'nyx_a': 'neon-nyx', 'sera_a': 'neon-seraphina', 'k9_a': 'neon-k9000'}
OUT_PX, PPU_OUT, SS, ANCHOR_Y = 440, 223.0, 3, 0.855
GLOW_R = ((3, 0.6), (8, 0.5), (18, 0.35))   # bán kính quầng sáng (px ở cỡ 440)


def fixed_camera():
    s = bpy.context.scene
    cd = bpy.data.cameras.new('cam'); cd.type = 'ORTHO'
    cam = bpy.data.objects.new('cam', cd); s.collection.objects.link(cam); s.camera = cam
    e, a = math.radians(30), math.radians(45)
    dirv = Vector((math.sin(a) * math.cos(e), -math.cos(a) * math.cos(e), math.sin(e)))
    q = (-dirv).to_track_quat('-Z', 'Y')
    up = q.to_matrix().col[1]
    cd.ortho_scale = OUT_PX / PPU_OUT
    cam.location = up * ((ANCHOR_Y - 0.5) * OUT_PX / PPU_OUT) + dirv * 10
    cam.rotation_mode = 'QUATERNION'; cam.rotation_quaternion = q
    cd.clip_end = 50
    return cam


def export(key, outdir):
    import base64, io
    import numpy as np
    from PIL import Image, ImageFilter
    s = bpy.context.scene
    s.render.resolution_x = s.render.resolution_y = OUT_PX * SS
    s.render.film_transparent = True
    fixed_camera()
    tmp = os.path.join(OUT, key + '_export')
    lib.render(tmp + '.png')
    glow_pass()
    lib.render(tmp + '_glow.png')

    def f32(im):
        return np.asarray(im).astype(np.float32) / 255.0

    def small(path):   # thu nhỏ có nhân trước alpha
        a = f32(Image.open(path).convert('RGBA'))
        pm = Image.fromarray((np.dstack([a[..., :3] * a[..., 3:4], a[..., 3]]) * 255 + 0.5).astype(np.uint8), 'RGBA')
        return f32(pm.resize((OUT_PX, OUT_PX), Image.LANCZOS))   # premultiplied
    tok, gm = small(tmp + '.png'), small(tmp + '_glow.png')
    src = Image.fromarray((np.clip(gm[..., :3], 0, 1) * 255).astype(np.uint8))
    g = np.zeros((OUT_PX, OUT_PX, 3), np.float32)
    for r, w in GLOW_R:
        g += f32(src.filter(ImageFilter.GaussianBlur(r))) * w
    g = np.clip(g, 0, 1)
    ga = g.max(-1, keepdims=True)                     # quầng sáng thành lớp màu chủ có alpha
    ta = tok[..., 3:4]
    rgb = tok[..., :3] + g * (1 - ta)                 # token (premult) đè lên quầng
    rgb = rgb + (1 - rgb) * g * 0.35 * ta             # loang nhẹ lên thân
    al = ta + ga * (1 - ta)
    al = np.where(al < 0.03, 0, al)                                       # bỏ quầng quá mờ (tránh khối vuông khi lượng tử)
    fade = np.clip((OUT_PX - 1 - np.arange(OUT_PX)) / 10.0, 0, 1)[:, None, None]
    al = np.where(ta > 0.5, al, al * fade)                                # quầng mờ dần ở mép dưới khung
    out = np.dstack([np.where(al > 1e-4, rgb / np.maximum(al, 1e-4), 0), al])
    im = Image.fromarray((np.clip(out, 0, 1) * 255 + 0.5).astype(np.uint8), 'RGBA')
    im.save(tmp + '_final.png')
    q = im.quantize(256, method=Image.Quantize.FASTOCTREE, dither=Image.Dither.FLOYDSTEINBERG)   # PNG bảng màu cho SVG nhẹ
    buf = io.BytesIO(); q.save(buf, 'PNG', optimize=True)
    b64 = base64.b64encode(buf.getvalue()).decode()
    svg = ('<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 220 220" width="220" height="220">'
           '<image width="220" height="220" xlink:href="data:image/png;base64,%s" href="data:image/png;base64,%s"/></svg>\n' % (b64, b64))
    fn = os.path.join(outdir, IDS[key] + '-token.svg')
    open(fn, 'w').write(svg)
    print('EXPORT', fn, len(svg) // 1024, 'KB')


if __name__ == '__main__':
    import json
    key, res, tag = sys.argv[1], int(sys.argv[2]), sys.argv[3]
    if tag == 'pbrortho':   # chỉ đo ortho của bản PBR cũ (el=35)
        hx, M = build(key)
        cam = lib.camera_fit(ortho=1.72, margin=1.06)
        json.dump({'ortho': cam.data.ortho_scale}, open(os.path.join(OUT, key + '_pbr.json'), 'w'))
        sys.exit(0)
    hx, M = build(key)
    toonify(hx, M, key)
    if tag == 'export':   # python3 toon.py <key> 0 export <thư-mục-ra>
        export(key, sys.argv[4])
        sys.exit(0)
    s = bpy.context.scene
    s.render.resolution_x = s.render.resolution_y = res
    cam = lib.camera_fit(ortho=2.1, el=30, az=45, margin=1.04)
    json.dump({'ortho': cam.data.ortho_scale, 'res': res}, open(os.path.join(OUT, '%s_toon_%s.json' % (key, tag)), 'w'))
    lib.render(os.path.join(OUT, '%s_toon_%s.png' % (key, tag)))
    glow_pass()
    lib.render(os.path.join(OUT, '%s_toon_%s_glow.png' % (key, tag)))
