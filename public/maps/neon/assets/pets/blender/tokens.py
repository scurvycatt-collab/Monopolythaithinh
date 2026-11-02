# Dựng 8 quân cờ neon. Chạy: python3 tokens.py <key> [samples]
import sys, os, math, random, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bpy, bmesh
from mathutils import Vector, Euler, Matrix
from lib import *
import lib

import tempfile
OUT = os.environ.get('NEON_TOKEN_TMP', os.path.join(tempfile.gettempdir(), 'neon-token-renders'))   # ảnh trung gian, không commit
os.makedirs(OUT, exist_ok=True)
FONT = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'

# ================= VANCE =================
def vance_a(M):
    base(M, 'gold')
    for i, a in enumerate((0, math.pi)):
        pass
    emitter(M, 0.26)
    Z = 0.46
    # thân xe: loft các mặt cắt siêu elip dọc trục x
    L0, L1, NS, NR = -0.47, 0.47, 28, 32
    def prof(x):
        t = (x - L0) / (L1 - L0)
        w = 0.22 * (1 - 0.6 * t ** 2.3) + 0.012
        top = 0.07 + 0.055 * math.sin(math.pi * min(t * 1.1, 1)) - 0.07 * t ** 3
        bot = -0.075 + 0.04 * t ** 2
        return w, top, bot
    bm = bmesh.new()
    rings = []
    for i in range(NS + 1):
        x = L0 + (L1 - L0) * i / NS
        w, top, bot = prof(x)
        mid, hh = (top + bot) / 2, (top - bot) / 2
        ring = []
        for j in range(NR):
            a = 2 * math.pi * j / NR
            c, sn = math.cos(a), math.sin(a)
            yy = w * math.copysign(abs(c) ** (2 / 3.0), c)
            zz = mid + hh * math.copysign(abs(sn) ** (2 / 3.0), sn)
            ring.append(bm.verts.new((x, yy, zz)))
        rings.append(ring)
    for i in range(NS):
        for j in range(NR):
            f = bm.faces.new((rings[i][j], rings[i + 1][j], rings[i + 1][(j + 1) % NR], rings[i][(j + 1) % NR]))
            f.material_index = 1 if (math.pi < 2 * math.pi * (j + 0.5) / NR < 2 * math.pi) and \
                abs(math.sin(2 * math.pi * (j + 0.5) / NR)) > 0.5 else 0
    bm.faces.new(list(reversed(rings[0])))
    bm.faces.new(rings[-1])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    body = from_bm('carBody', bm, M['gold'], (0, 0, Z))
    body.data.materials.append(M['chrome'])
    subsurf(body, 2)
    # dải đèn chạy dọc hông, theo đường rộng nhất
    for s in (-1, 1):
        pts = []
        for i in range(9):
            x = -0.4 + 0.8 * i / 8
            w, top, bot = prof(x)
            pts.append((x, s * (w + 0.002), Z + (top + bot) / 2 - 0.004))
        cable('strip%d' % s, pts, 0.006, M['emit'])
    # buồng lái kính đen
    sphere('canopy', 0.25, (-0.04, 0, Z + 0.105), M['glassblk'], seg=48, scale=(1.0, 0.5, 0.34))
    torus('canopyRim', 0.25, 0.007, (-0.04, 0, Z + 0.108), M['chrome'], seg=96)
    lib.PARTS[-1].scale = (1.0, 0.5, 1.0)
    # cánh gió sau + trụ
    box('spoiler', (0.09, 0.4, 0.016), (-0.43, 0, Z + 0.17), M['chrome'], bev=0.008, rot=(0, -0.12, 0))
    box('spoilerLed', (0.016, 0.38, 0.008), (-0.475, 0, Z + 0.172), M['emit'], bev=0.002, rot=(0, -0.12, 0))
    for s in (-1, 1):
        box('strut%d' % s, (0.05, 0.018, 0.12), (-0.41, s * 0.13, Z + 0.12), M['chrome'], bev=0.006, rot=(0, 0.3, 0))
        box('finS%d' % s, (0.12, 0.012, 0.05), (-0.43, s * 0.2, Z + 0.15), M['chrome'], bev=0.005)
    # động cơ đẩy sau
    for s in (-1, 1):
        p = (-0.45, s * 0.1, Z - 0.01)
        cyl('thr%d' % s, 0.065, 0.14, p, M['chrome'], seg=48, bev=0.01, rot=(0, math.pi / 2, 0))
        torus('thrRing%d' % s, 0.066, 0.008, (-0.485, s * 0.1, Z - 0.01), M['gold'], rot=(0, math.pi / 2, 0))
        cyl('thrCore%d' % s, 0.048, 0.01, (-0.52, s * 0.1, Z - 0.01), M['white'], seg=48, bev=0, rot=(0, math.pi / 2, 0))
        cyl('thrFlame%d' % s, 0.045, 0.1, (-0.57, s * 0.1, Z - 0.01), M['holo'], seg=32, r2=0.01, bev=0,
            rot=(0, -math.pi / 2, 0))
    # đèn pha
    for s in (-1, 1):
        box('head%d' % s, (0.06, 0.02, 0.01), (0.43, s * 0.05, Z + 0.0), M['white'], bev=0.003, rot=(0, 0, s * 0.5))
    # đệm nâng từ trường
    for x in (-0.25, 0.2):
        for s in (-1, 1):
            cyl('pad', 0.05, 0.03, (x, s * 0.12, Z - 0.07), M['chrome'], seg=32, bev=0.006)
            cyl('padE', 0.036, 0.006, (x, s * 0.12, Z - 0.086), M['emit'], seg=32, bev=0)
    for x in (-0.2, 0.0, 0.2):
        for s in (-1, 1):
            pass  # sphere('bolt', 0.008, (x, s * (prof(x)[0] - 0.01), Z + prof(x)[1] - 0.012), M['chrome'], seg=12)
    plight('under', (0, 0, Z - 0.16), M['own'], 6, 0.2)
    group(math.radians(40))

def vance_b(M):
    base(M, 'gold')
    emitter(M, 0.27)
    H = T + 0.11
    prof = [(0, 0), (0.29, 0), (0.30, 0.03), (0.27, 0.06), (0.275, 0.085), (0.22, 0.11), (0.19, 0.14),
            (0.15, 0.2), (0.125, 0.32), (0.11, 0.46), (0.115, 0.5), (0.18, 0.53), (0.19, 0.56),
            (0.14, 0.585), (0.13, 0.6), (0.16, 0.7), (0.2, 0.78), (0.2, 0.8), (0.15, 0.835), (0.06, 0.85), (0, 0.85)]
    k = lathe('king', prof, M['glassblk'], seg=96, loc=(0, 0, H))
    core = [(0, 0.06), (0.12, 0.06), (0.09, 0.2), (0.06, 0.45), (0.1, 0.55), (0.06, 0.6), (0.11, 0.76), (0.07, 0.8), (0, 0.8)]
    lathe('core', core, M['goldglow'], seg=64, loc=(0, 0, H))
    torus('band1', 0.2, 0.03, (0, 0, H + 0.545), M['gold'])
    torus('band2', 0.285, 0.032, (0, 0, H + 0.075), M['gold'])
    torus('band3', 0.21, 0.026, (0, 0, H + 0.79), M['gold'])
    torus('bandE', 0.125, 0.016, (0, 0, H + 0.47), M['emit'])
    # vương miện: 8 răng nhỏ
    for i in range(8):
        a = 2 * math.pi * i / 8
        box('crown%d' % i, (0.035, 0.02, 0.05), (0.19 * math.cos(a), 0.19 * math.sin(a), H + 0.82), M['gold'],
            bev=0.006, rot=(0, 0, a))
    sphere('orb', 0.05, (0, 0, H + 0.875), M['gold'], seg=32)
    box('crossV', (0.045, 0.045, 0.2), (0, 0, H + 1.0), M['gold'], bev=0.01)
    box('crossH', (0.15, 0.045, 0.045), (0, 0, H + 1.03), M['gold'], bev=0.01, rot=(0, 0, math.radians(-45)))
    lib.PARTS[-2].rotation_euler = (0, 0, math.radians(-45))
    sphere('gem', 0.024, (0.016, -0.016, H + 1.03), M['white'], seg=16)
    # vòng từ trường dưới chân
    torus('hov1', 0.33, 0.007, (0, 0, T + 0.07), M['holo'])
    torus('hov2', 0.24, 0.006, (0, 0, T + 0.05), M['holo'])
    plight('core', (0, 0, H + 0.4), M['own'], 0.8, 0.05)
    plight('under', (0, 0, H - 0.04), M['own'], 5, 0.2)
    group(0)

# ================= NYX =================
def nyx_a(M):
    base(M)
    Z = T + 0.30
    sphere('body', 0.2, (0, 0, Z), M['chrome'], seg=48, scale=(1.15, 1.0, 0.55))
    sphere('belly', 0.15, (0, 0, Z - 0.05), M['gun'], seg=32, scale=(1.1, 1.0, 0.5))
    torus('ring', 0.21, 0.02, (0, 0, Z), M['steel'], seg=96)
    lib.PARTS[-1].scale = (1.15, 1.0, 1.0)
    torus('ringE', 0.214, 0.014, (0, 0, Z + 0.022), M['emit'], seg=96)
    lib.PARTS[-1].scale = (1.15, 1.0, 1.0)
    sphere('dome', 0.1, (-0.03, 0, Z + 0.07), M['glasscy'], seg=48, scale=(1, 1, 0.8))
    sphere('domeCore', 0.05, (-0.03, 0, Z + 0.08), M['emit'], seg=24)
    torus('domeRim', 0.1, 0.01, (-0.03, 0, Z + 0.07), M['chrome'])
    # cụm mắt phía trước (+x)
    cyl('eyeH', 0.07, 0.07, (0.22, 0, Z + 0.01), M['chrome'], seg=48, bev=0.01, rot=(0, math.pi / 2, 0))
    cyl('eye', 0.045, 0.01, (0.257, 0, Z + 0.01), M['emit'], seg=48, bev=0, rot=(0, math.pi / 2, 0))
    torus('eyeR', 0.05, 0.007, (0.258, 0, Z + 0.01), M['steel'], rot=(0, math.pi / 2, 0))
    for s in (-1, 1):
        cyl('eyeS', 0.022, 0.03, (0.215, s * 0.09, Z + 0.06), M['chrome'], seg=24, bev=0.004, rot=(0, math.pi / 2, 0))
        cyl('eyeSE', 0.015, 0.006, (0.232, s * 0.09, Z + 0.06), M['emit'], seg=24, bev=0, rot=(0, math.pi / 2, 0))
    # ăng-ten sau
    cyl_between('ant', (-0.18, 0.05, Z + 0.06), (-0.26, 0.08, Z + 0.24), 0.007, M['steel'])
    sphere('antTip', 0.016, (-0.26, 0.08, Z + 0.245), M['emit'], seg=16)
    # 4 chân
    for i in range(4):
        a = math.radians(45 + 90 * i)
        c, s_ = math.cos(a), math.sin(a)
        hip = Vector((0.17 * c, 0.17 * s_, Z - 0.01))
        knee = Vector((0.36 * c, 0.36 * s_, Z + 0.17))
        foot = Vector((0.52 * c, 0.52 * s_, T + 0.025))
        sphere('hip', 0.06, hip, M['steel'], seg=24)
        cyl_between('thigh', hip, knee, 0.05, M['steel'], r2=0.04, bev=0.006)
        side = Vector((-s_, c, 0)) * 0.03
        cyl_between('piston', hip + side + Vector((0, 0, 0.02)), (hip + knee) / 2 + side + Vector((0, 0, 0.03)), 0.009, M['steel'])
        cyl_between('pistonR', (hip + knee) / 2 + side + Vector((0, 0, 0.03)), knee + side * 0.5, 0.006, M['chrome'])
        sphere('knee', 0.06, knee, M['gun'], seg=24)
        q = (knee - hip).to_track_quat('Z', 'Y')
        torus('kneeE', 0.062, 0.012, knee, M['emit'], rot=Vector((-s_, c, 0)).to_track_quat('Z', 'Y'))
        cyl_between('shin', knee, foot, 0.042, M['chrome'], r2=0.022, bev=0.005)
        cyl_between('shinE', knee + (foot - knee) * 0.15 + Vector((0, 0, 0.022)),
                    knee + (foot - knee) * 0.7 + Vector((0, 0, 0.012)), 0.014, M['emit'])
        cyl('foot', 0.03, 0.02, foot - Vector((0, 0, 0.012)), M['steel'], seg=24, bev=0.005)
        cable('cab', [hip + Vector((0, 0, 0.03)), (hip + knee) / 2 + Vector((0, 0, 0.07)), knee + Vector((0, 0, 0.03))], 0.005, M['rubber'])
    for i in range(8):
        a = 2 * math.pi * i / 8 + 0.2
        sphere('bolt', 0.009, (0.215 * 1.15 * math.cos(a), 0.215 * math.sin(a), Z - 0.018), M['chrome'], seg=12)
    group(math.radians(-45))

def nyx_b(M):
    base(M)
    emitter(M, 0.24)
    C = Vector((0, 0, T + 0.62))
    n, e, g = 3, 0.17, 0.018
    step = e + g
    random.seed(7)
    box('coreC', (step * 3 - 0.03,) * 3, C, M['core'], bev=0.0)
    root_top = bpy.data.objects.new('topLayer', None)
    bpy.context.scene.collection.objects.link(root_top)
    lib.PARTS.append(root_top)
    root_top.location = C
    root_top.rotation_euler = (0, 0, math.radians(28))
    for i in range(n):
        for j in range(n):
            for k in range(n):
                if i == 1 and j == 1 and k == 1:
                    continue
                p = Vector(((i - 1) * step, (j - 1) * step, (k - 1) * step))
                if i == 2 and j == 0 and k == 2:
                    p += Vector((0.09, -0.09, 0.09))  # mảnh tách ra
                m = M['glasscy'] if random.random() < 0.18 else M['chrome']
                o = box('cubie', (e, e, e), p, m, bev=0.018, seg=3)
                if k == 2:
                    o.parent = root_top
                else:
                    o.location = C + p
                # đốm dữ liệu trên mặt ngoài
                for ax, sgn, cond in ((0, 1, i == 2), (1, -1, j == 0), (2, 1, k == 2), (0, -1, i == 0), (1, 1, j == 2)):
                    if cond and random.random() < 0.55:
                        off = Vector((0, 0, 0)); off[ax] = sgn * (e / 2 + 0.001)
                        sz = [random.choice((0.03, 0.05, 0.09)), 0.025, 0.002]
                        dims = [0, 0, 0]
                        others = [a for a in range(3) if a != ax]
                        dims[ax] = 0.004; dims[others[0]] = sz[0]; dims[others[1]] = sz[1]
                        jit = Vector((0, 0, 0))
                        jit[others[0]] = random.uniform(-0.03, 0.03); jit[others[1]] = random.uniform(-0.05, 0.05)
                        d = box('pip', dims, p + off + jit, M['emit'], bev=0.0)
                        if k == 2:
                            d.parent = root_top
                        else:
                            d.location = C + p + off + jit
    # vòng quỹ đạo
    torus('orbit1', 0.5, 0.005, C, M['emit_lo'], rot=(math.radians(70), 0, math.radians(20)))
    torus('orbit2', 0.46, 0.004, C, M['holo'], rot=(math.radians(-60), math.radians(30), 0))
    sphere('sat', 0.022, C + Vector((0.5 * math.cos(1.0), 0, 0)).copy(), M['emit'], seg=16)
    lib.PARTS[-1].location = (C.x + 0.17, C.y - 0.47 * 0.34, C.z + 0.44)
    cyl('beam', 0.19, 0.30, (0, 0, T + 0.19), M['holo'], seg=48, r2=0.26, bev=0)
    plight('under', (0, 0, T + 0.2), M['own'], 6, 0.2)
    group(math.radians(-45 + 15))

# ================= SERAPHINA =================
def sera_a(M):
    base(M)
    P = M['plate']; P2 = M['plate2']
    parts = []
    body = [(-0.16, 0.22, 0.0), (0.16, 0.22, 0.0), (-0.2, 0.28, 0.2), (0.2, 0.28, 0.2), (0, 0.34, 0.3),
            (-0.1, 0.06, 0.5), (0.1, 0.06, 0.5), (0, 0.12, 0.56), (-0.12, -0.08, 0.3), (0.12, -0.08, 0.3),
            (0, -0.15, 0.42), (0, 0.32, 0.03), (-0.13, -0.02, 0.05), (0.13, -0.02, 0.05)]
    parts.append(hull('fBody', body, P, mats2=P2))
    head = [(-0.11, 0.02, 0.6), (0.11, 0.02, 0.6), (0, 0.05, 0.71), (-0.15, -0.09, 0.56), (0.15, -0.09, 0.56),
            (0, -0.38, 0.5), (0, -0.19, 0.45), (-0.05, -0.3, 0.54), (0.05, -0.3, 0.54), (0, -0.12, 0.67),
            (-0.07, 0.04, 0.48), (0.07, 0.04, 0.48)]
    parts.append(hull('fHead', head, P, mats2=P2))
    for s in (-1, 1):
        ear = [(s * 0.15, -0.06, 0.59), (s * 0.01, -0.08, 0.68), (s * 0.09, 0.08, 0.64), (s * 0.17, -0.01, 0.95)]
        parts.append(hull('fEar', ear, P2, mats2=P))
        inner = [(s * 0.125, -0.075, 0.62), (s * 0.04, -0.09, 0.68), (s * 0.15, -0.05, 0.87), (s * 0.1, -0.06, 0.66)]
        parts.append(hull('fEarIn', inner, M['emit_lo']))
        x = s * 0.075
        leg = [(x - 0.04, -0.04, 0.36), (x + 0.04, -0.04, 0.36), (x, 0.01, 0.33), (x - 0.03, -0.13, 0.0),
               (x + 0.03, -0.13, 0.0), (x, -0.07, 0.0), (x, -0.1, 0.25)]
        parts.append(hull('fLeg', leg, P2, mats2=P))
        paw = [(x - 0.04, -0.12, 0), (x + 0.04, -0.12, 0), (x, -0.2, 0), (x, -0.13, 0.045), (x, -0.06, 0)]
        parts.append(hull('fPaw', paw, P, mats2=P2))
        hind = [(s * 0.1, -0.03, 0), (s * 0.23, 0.0, 0), (s * 0.22, 0.24, 0), (s * 0.2, 0.12, 0.12),
                (s * 0.12, -0.06, 0.035), (s * 0.24, 0.12, 0.22)]
        parts.append(hull('fHind', hind, P2, mats2=P))
    # đuôi cuộn sang phải
    path = [(0.03, 0.3, 0.08), (0.24, 0.36, 0.12), (0.4, 0.16, 0.1), (0.38, -0.1, 0.07), (0.24, -0.26, 0.05)]
    rad = [0.09, 0.145, 0.16, 0.13, 0.03]
    for i in range(len(path) - 1):
        pts = []
        for jj in (i, i + 1):
            p = Vector(path[jj]); r = rad[jj]
            nxt = Vector(path[min(jj + 1, len(path) - 1)]) - Vector(path[max(jj - 1, 0)])
            side = nxt.cross(Vector((0, 0, 1))).normalized()
            if r == 0:
                pts.append(tuple(p)); continue
            pts += [tuple(p + Vector((0, 0, r))), tuple(p + Vector((0, 0, -r * 0.5 + 0.0))),
                    tuple(p + side * r), tuple(p - side * r * 0.8)]
        for q in range(len(pts)):
            x, y, z = pts[q]
            pts[q] = (x, y, max(z, 0.0))
        parts.append(hull('fTail%d' % i, pts, P if i < 3 else M['tailtip'], mats2=P2 if i < 3 else M['steel']))
    for o in parts:
        o.location = (0, 0, T)
        bevel(o, 0.004, 1, angle=5, harden=False)
        w = wire_copy(o, M['emit'], 0.011)
        w.location = (0, 0, T)
    # mắt và mũi
    for s in (-1, 1):
        box('eye', (0.05, 0.012, 0.012), (s * 0.075, -0.205, T + 0.58), M['white'], bev=0.003,
            rot=(0.5, 0, -s * 0.6))
    sphere('nose', 0.02, (0, -0.385, T + 0.5), M['chrome'], seg=16)
    # vòng cổ cơ khí
    torus('collar', 0.105, 0.014, (0, -0.02, T + 0.5), M['steel'], rot=(math.radians(28), 0, 0))
    sphere('tag', 0.022, (0, -0.12, T + 0.45), M['emit'], seg=16)
    group(math.radians(55))

def sera_b(M):
    base(M)
    S = 1.12
    Z0 = T + 0.045
    cyl('holder', 0.27, 0.045, (0, 0, T + 0.0225), M['steel'], seg=64, bev=0.008)
    torus('holderE', 0.255, 0.007, (0, 0, T + 0.046), M['emit'])
    for i in range(6):
        a = 2 * math.pi * i / 6
        cyl('hbolt', 0.014, 0.014, (0.215 * math.cos(a), 0.215 * math.sin(a), T + 0.05), M['chrome'], seg=6, bev=0.003)
    cyl('clamp', 0.05, 0.06, (0, 0, Z0 + 0.04), M['chrome'], seg=32, bev=0.008)
    gp = [(0, 0), (0.22, 0), (0.225, 0.008), (0.2, 0.018), (0.035, 0.035), (0.02, 0.06), (0.017, 0.3),
          (0.025, 0.34), (0.045, 0.37), (0.3, 0.62)]
    gl = lathe('glass', [(r * S, z * S) for r, z in gp], M['hologlass'], seg=96, loc=(0, 0, Z0))
    so = gl.modifiers.new('sol', 'SOLIDIFY'); so.thickness = 0.008; so.offset = -1
    torus('rim', 0.3 * S, 0.004, (0, 0, Z0 + 0.62 * S), M['emit'], seg=128)
    def rb(z):
        return (0.045 + 0.255 * (z - 0.37) / 0.25) * S
    zl = 0.575
    lathe('liquid', [(0, 0.38 * S), (rb(0.38) - 0.01, 0.38 * S), (rb(zl) - 0.012, zl * S), (0, zl * S)],
          M['liquid'], seg=96, loc=(0, 0, Z0))
    torus('meniscus', rb(zl) - 0.014, 0.004, (0, 0, Z0 + zl * S), M['emit'], seg=128)
    ice = box('ice', (0.12, 0.12, 0.12), (0.03, -0.02, Z0 + zl * S + 0.01), M['ice'], bev=0.02, seg=3,
              rot=(0.4, 0.3, 0.6))
    box('iceCore', (0.06, 0.06, 0.06), (0.03, -0.02, Z0 + zl * S + 0.01), M['white'], bev=0.01, rot=(0.4, 0.3, 0.6))
    # que xiên + cherry
    cyl_between('pick', (-0.05, 0.05, Z0 + 0.5 * S), (-0.2, 0.17, Z0 + 0.86 * S), 0.006, M['gold'])
    sphere('cherry', 0.045, (-0.11, 0.1, Z0 + 0.67 * S), M['cherry'], seg=32)
    box('pickTop', (0.04, 0.012, 0.03), (-0.2, 0.17, Z0 + 0.87 * S), M['emit'], bev=0.004)
    # vòng quét hologram
    for zz, rr in ((0.2, 0.17), (0.45, 0.28), (0.72, 0.36)):
        torus('scan', rr * S, 0.003, (0, 0, Z0 + zz * S), M['holo'], seg=128)
    # bọt / tia sáng
    random.seed(3)
    for i in range(10):
        a = random.uniform(0, 6.28); r = random.uniform(0.02, 0.18)
        sphere('bub', random.uniform(0.006, 0.012), (r * math.cos(a), r * math.sin(a), Z0 + random.uniform(0.42, 0.62) * S),
               M['white'], seg=10)
    plight('glow', (0, 0, Z0 + 0.5 * S), M['own'], 4, 0.1)
    group(0)

# ================= K-9000 =================
def k9_a(M):
    base(M)
    G = M['emit']
    Z = T
    box('plinth', (0.56, 0.42, 0.06), (0, 0, Z + 0.03), M['chrome'], bev=0.012)
    body = box('cab', (0.5, 0.36, 0.5), (0, 0, Z + 0.31), M['gun'], bev=0.0)
    for nm, sz, loc in (('cutReel', (0.42, 0.2, 0.19), (0, -0.2, Z + 0.43)),
                        ('cutTray', (0.3, 0.14, 0.07), (0, -0.21, Z + 0.135))):
        c = box(nm, sz, loc, None, bev=0)
        c.hide_render = True
        c.display_type = 'WIRE'
        lib.PARTS.remove(c)
        b = body.modifiers.new(nm, 'BOOLEAN'); b.object = c; b.operation = 'DIFFERENCE'
    bevel(body, 0.012, 3, angle=35)
    # vòm trên
    cyl('crown', 0.25, 0.36, (0, 0, Z + 0.56), M['chrome'], seg=64, bev=0.012, rot=(math.pi / 2, 0, 0))
    lib.PARTS[-1].scale = (1.0, 0.55, 1.0)
    box('crownCap', (0.5, 0.36, 0.02), (0, 0, Z + 0.565), M['steel'], bev=0.006)
    box('sign', (0.34, 0.01, 0.07), (0, -0.181, Z + 0.63), M['chrome'], bev=0.004)
    text('jack', 'JACKPOT', 0.06, (0, -0.188, Z + 0.63), (math.pi / 2, 0, 0), G, extrude=0.003, bev=0, font=FONT)
    # còi báo trên đỉnh
    cyl('beaconB', 0.05, 0.03, (0, 0, Z + 0.705), M['steel'], seg=32, bev=0.006)
    sphere('beacon', 0.045, (0, 0, Z + 0.725), M['glassgr'], seg=32, scale=(1, 1, 1.2))
    sphere('beaconC', 0.022, (0, 0, Z + 0.73), M['white'], seg=16)
    # cuộn 777
    for i, x in enumerate((-0.13, 0.0, 0.13)):
        cyl('reel', 0.1, 0.115, (x, -0.06, Z + 0.43), M['reel'], seg=64, bev=0.006, rot=(0, math.pi / 2, 0))
        text('seven', '7', 0.13, (x, -0.161, Z + 0.43), (math.pi / 2, 0, 0), G, extrude=0.004, bev=0.001, font=FONT)
        text('sevA', '$', 0.07, (x, -0.13, Z + 0.515), (math.pi / 2 - 0.9, 0, 0), M['emit_lo'], extrude=0.002, bev=0, font=FONT)
    for x in (-0.065, 0.065):
        box('reelDiv', (0.012, 0.06, 0.19), (x, -0.16, Z + 0.43), M['chrome'], bev=0.003)
    # viền đèn khung cửa sổ
    for loc, sz in (((0, -0.181, Z + 0.53), (0.44, 0.012, 0.012)), ((0, -0.181, Z + 0.33), (0.44, 0.012, 0.012)),
                    ((-0.215, -0.181, Z + 0.43), (0.012, 0.012, 0.2)), ((0.215, -0.181, Z + 0.43), (0.012, 0.012, 0.2))):
        box('frame', sz, loc, G, bev=0.003)
    box('payline', (0.42, 0.004, 0.005), (0, -0.17, Z + 0.43), M['white'], bev=0)
    # bàn nút
    box('ledge', (0.48, 0.1, 0.03), (0, -0.21, Z + 0.29), M['chrome'], bev=0.008, rot=(-0.3, 0, 0))
    for i, x in enumerate((-0.14, -0.05, 0.04, 0.14)):
        cyl('btn', 0.022, 0.02, (x, -0.215, Z + 0.312), G if i != 1 else M['white'], seg=24, bev=0.005, rot=(-0.3, 0, 0))
    # khe xu, khay
    box('slot', (0.05, 0.01, 0.012), (0.17, -0.181, Z + 0.21), M['white'], bev=0.002)
    box('trayLip', (0.32, 0.03, 0.012), (0, -0.19, Z + 0.1), M['steel'], bev=0.004)
    for i in range(5):
        cyl('coin', 0.025, 0.008, (-0.08 + i * 0.04, -0.17, Z + 0.112 + (i % 2) * 0.006), M['gold'], seg=24, bev=0.002,
            rot=(0.2 * (i - 2), 0.3, 0))
    # dải đèn đứng hai mép trước
    for s in (-1, 1):
        box('edgeE', (0.01, 0.01, 0.42), (s * 0.252, -0.182, Z + 0.31), G, bev=0.002)
    # tay gạt bên +x
    cyl('levBase', 0.06, 0.05, (0.275, 0.0, Z + 0.36), M['steel'], seg=48, bev=0.01, rot=(0, math.pi / 2, 0))
    torus('levRing', 0.05, 0.007, (0.302, 0, Z + 0.36), G, rot=(0, math.pi / 2, 0))
    cyl_between('levArm', (0.31, 0, Z + 0.36), (0.34, -0.03, Z + 0.7), 0.014, M['chromeL'])
    sphere('knob', 0.05, (0.342, -0.032, Z + 0.72), M['knob'], seg=32)
    # khe thông gió bên hông
    for i in range(6):
        box('vent', (0.004, 0.24, 0.012), (0.251, 0.0, Z + 0.13 + i * 0.03), M['rubber'], bev=0.002)
    for sx in (-1, 1):
        for sy in (-1, 1):
            sphere('rv', 0.01, (sx * 0.23, -0.183, Z + 0.075 + (sy + 1) * 0.215), M['steel'], seg=12)
            cyl('foot', 0.03, 0.02, (sx * 0.23, sy * 0.17, Z + 0.0), M['rubber'], seg=16, bev=0.004)
    cable('cab', [(-0.25, 0.12, Z + 0.5), (-0.33, 0.16, Z + 0.3), (-0.3, 0.2, Z + 0.07), (-0.2, 0.3, Z + 0.01)], 0.008, M['rubber'])
    plight('glow', (0, -0.4, Z + 0.45), M['own'], 2, 0.1)
    group(math.radians(18))

def k9_b(M):
    base(M)
    Z = T
    cyl('ped', 0.17, 0.08, (0, 0, Z + 0.04), M['steel'], seg=64, bev=0.012)
    cyl('ped2', 0.12, 0.05, (0, 0, Z + 0.105), M['chrome'], seg=64, bev=0.01)
    torus('pedE', 0.172, 0.006, (0, 0, Z + 0.06), M['emit'])
    for i in range(10):
        a = 2 * math.pi * i / 10
        box('pv', (0.004, 0.03, 0.04), (0.172 * math.cos(a), 0.172 * math.sin(a), Z + 0.035), M['rubber'], bev=0.0015, rot=(0, 0, a))
    C = Vector((0, 0, Z + 0.56))
    R = 0.40
    cyl_between('post', (0, 0, Z + 0.12), (0, 0, C.z - R - 0.02), 0.03, M['chrome'])
    # vòng gimbal đứng
    gim = bpy.data.objects.new('gim', None); bpy.context.scene.collection.objects.link(gim); lib.PARTS.append(gim)
    gim.location = C
    gim.rotation_euler = (math.pi / 2, 0, math.radians(110))
    for nm, rr, mm, rl in (('g1', 0.026, M['gun'], 0), ('g2', 0.008, M['emit'], 0.022)):
        t = torus(nm, R, rr, (0, 0, rl), mm, seg=128, mseg=20)
        t.parent = gim
    t = torus('g3', R, 0.008, (0, 0, -0.022), M['emit'], seg=128); t.parent = gim
    cyl_between('pinB', C - Vector((0, 0, R)), C - Vector((0, 0, 0.3)), 0.012, M['steel'])
    cyl_between('pinT', C + Vector((0, 0, 0.3)), C + Vector((0, 0, R)), 0.012, M['steel'])
    cyl('hubT', 0.03, 0.03, C + Vector((0, 0, R + 0.01)), M['chrome'], seg=24, bev=0.006)
    sphere('lamp', 0.018, C + Vector((0, 0, R + 0.035)), M['emit'], seg=16)
    # đồng xu
    coin = bpy.data.objects.new('coin', None); bpy.context.scene.collection.objects.link(coin); lib.PARTS.append(coin)
    coin.location = C
    coin.rotation_euler = (math.pi / 2, 0.0, math.radians(35))
    CR, CT = 0.3, 0.07
    parts = [cyl('cBody', CR, CT, (0, 0, 0), M['coin'], seg=128, bev=0.01),
             cyl('cFaceF', 0.235, 0.008, (0, 0, CT / 2), M['gun'], seg=96, bev=0.003),
             cyl('cFaceB', 0.235, 0.008, (0, 0, -CT / 2), M['gun'], seg=96, bev=0.003),
             torus('cRingF', 0.258, 0.007, (0, 0, CT / 2 + 0.001), M['emit'], seg=128),
             torus('cRingB', 0.258, 0.007, (0, 0, -CT / 2 - 0.001), M['emit'], seg=128),
             text('cSym', 'K', 0.3, (0, 0, CT / 2 + 0.004), (0, 0, 0), M['coin'], extrude=0.008, bev=0.003, font=FONT),
             text('cSymB', '9', 0.3, (0, 0, -CT / 2 - 0.004), (math.pi, 0, 0), M['coin'], extrude=0.008, bev=0.003, font=FONT)]
    for i in range(72):
        a = 2 * math.pi * i / 72
        parts.append(box('reed', (0.008, 0.012, CT * 0.7), (CR * math.cos(a), CR * math.sin(a), 0), M['coin'], bev=0.002, rot=(0, 0, a)))
    for i in range(12):
        a = 2 * math.pi * i / 12
        parts.append(box('tick', (0.025, 0.006, 0.004), (0.205 * math.cos(a), 0.205 * math.sin(a), CT / 2 + 0.006), M['emit'], bev=0, rot=(0, 0, a)))
    for p in parts:
        p.parent = coin
    # vệt xoay mờ
    torus('trail', 0.36, 0.004, C, M['holo'], rot=(0, 0, 0), seg=128)
    torus('trail2', 0.32, 0.003, C + Vector((0, 0, 0.02)), M['holo'], rot=(0.1, 0, 0), seg=128)
    cable('cab', [(0.1, 0.12, Z + 0.12), (0.2, 0.2, Z + 0.3), (0.25, 0.2, C.z - 0.3), (0.12, 0.08, C.z - 0.38)], 0.007, M['rubber'])
    plight('glow', C + Vector((0.3, -0.4, 0)), M['own'], 3, 0.2)
    group(math.radians(0))

# ================= chạy =================
CHARS = {
    'vance_a': ('#ffb81f', vance_a), 'vance_b': ('#ffb81f', vance_b),
    'nyx_a': ('#1fd8ff', nyx_a), 'nyx_b': ('#1fd8ff', nyx_b),
    'sera_a': ('#ff2fd2', sera_a), 'sera_b': ('#ff2fd2', sera_b),
    'k9_a': ('#a4ff1c', k9_a), 'k9_b': ('#a4ff1c', k9_b),
}

def extra_mats(M):
    own = M['own']
    M['glassblk'] = glass('glassblk', (0.07, 0.07, 0.09, 1), 0.03, rim=own, rim_s=0.25)
    M['goldglow'] = mat('goldglow', hexc('#ffb81f'), 1.0, 0.25, emit=own, es=0.6)
    M['holo'] = holo('holo', own, 2.5)
    M['glasscy'] = glass('glasscy', (0.6, 0.95, 1, 1), 0.05, rim=own, rim_s=2.0)
    M['glassgr'] = glass('glassgr', (0.8, 1, 0.6, 1), 0.05, rim=own, rim_s=2.0)
    M['plate'] = mat('plate', hexc('#ff2fd2', 0.55), 1.0, 0.22, coat=0.4)
    M['plate2'] = mat('plate2', (0.06, 0.02, 0.06, 1), 1.0, 0.18, coat=0.5)
    M['tailtip'] = mat('tailtip', (0.85, 0.85, 0.9, 1), 1.0, 0.15)
    M['hologlass'] = glass('hologlass', (0.95, 0.88, 1, 1), 0.01, rim=own, rim_s=0.7)
    M['liquid'] = mat('liquid', own, 0.0, 0.05, emit=own, es=0.7, trans=0.5)
    M['core'] = emissive('core', own, 1.2)
    M['ice'] = glass('ice', (0.95, 0.9, 1, 1), 0.08, rim=(1, 0.8, 1, 1), rim_s=1.5)
    M['cherry'] = mat('cherry', hexc('#c0103a'), 0.0, 0.15, coat=1.0, emit=hexc('#ff2050'), es=0.4)
    M['reel'] = mat('reel', (0.85, 0.86, 0.88, 1), 0.0, 0.35, coat=0.6)
    M['chromeL'] = mat('chromeL', (0.8, 0.8, 0.82, 1), 1.0, 0.08)
    M['knob'] = mat('knob', own, 0.0, 0.12, coat=1.0, emit=own, es=1.2)
    M['coin'] = mat('coin', (0.5, 0.62, 0.32, 1), 1.0, 0.22, aniso=0.4)

if __name__ == '__main__':
    key = sys.argv[1]
    spp = int(sys.argv[2]) if len(sys.argv) > 2 else 64
    hx, fn = CHARS[key]
    reset()
    M = std_mats(hx)
    extra_mats(M)
    scene_setup(hx, samples=spp)
    fn(M)
    camera_fit(ortho=1.72, margin=1.06)
    t = time.time()
    render(os.path.join(OUT, key + '.png'))
    print('RENDER_TIME', key, round(time.time() - t, 1))
