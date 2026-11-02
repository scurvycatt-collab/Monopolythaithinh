# Thư viện dựng hình chung cho token neon (bpy 5.x, Cycles CPU)
import bpy, bmesh, math, random
from mathutils import Vector, Matrix, Euler

PARTS = []
T = 0.14  # mặt trên đế

def hexc(h, k=1.0):
    def lin(c):
        return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4
    return tuple(lin(int(h[i:i + 2], 16) / 255) * k for i in (1, 3, 5)) + (1.0,)

def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    PARTS.clear()

def _bsdf(m):
    nt = m.node_tree
    b = nt.nodes.get('Principled BSDF')
    if b is None:
        for n in list(nt.nodes):
            nt.nodes.remove(n)
        b = nt.nodes.new('ShaderNodeBsdfPrincipled')
        o = nt.nodes.new('ShaderNodeOutputMaterial')
        nt.links.new(b.outputs[0], o.inputs[0])
    return b

def mat(name, base=(0.5, 0.5, 0.5, 1), metal=1.0, rough=0.3, emit=None, es=0.0,
        trans=0.0, ior=1.45, aniso=0.0, coat=0.0, brushed=False):
    m = bpy.data.materials.new(name)
    try:
        m.use_nodes = True
    except Exception:
        pass
    b = _bsdf(m)
    b.inputs['Base Color'].default_value = base
    b.inputs['Metallic'].default_value = metal
    b.inputs['Roughness'].default_value = rough
    b.inputs['IOR'].default_value = ior
    b.inputs['Transmission Weight'].default_value = trans
    b.inputs['Anisotropic'].default_value = aniso
    b.inputs['Coat Weight'].default_value = coat
    if emit:
        b.inputs['Emission Color'].default_value = emit
        b.inputs['Emission Strength'].default_value = es
    if brushed:
        nt = m.node_tree
        tc = nt.nodes.new('ShaderNodeTexCoord')
        mp = nt.nodes.new('ShaderNodeMapping')
        mp.inputs['Scale'].default_value = (1.5, 1.5, 120.0)
        nz = nt.nodes.new('ShaderNodeTexNoise')
        nz.inputs['Scale'].default_value = 6.0
        nz.inputs['Detail'].default_value = 8.0
        mr = nt.nodes.new('ShaderNodeMapRange')
        mr.inputs['To Min'].default_value = rough * 0.6
        mr.inputs['To Max'].default_value = rough * 1.5
        nt.links.new(tc.outputs['Object'], mp.inputs['Vector'])
        nt.links.new(mp.outputs['Vector'], nz.inputs['Vector'])
        nt.links.new(nz.outputs['Fac'], mr.inputs['Value'])
        nt.links.new(mr.outputs['Result'], b.inputs['Roughness'])
    return m

def emissive(name, col, s=6.0):
    return mat(name, base=(0, 0, 0, 1), metal=0, rough=0.5, emit=col, es=s)

def holo(name, col, s=1.5, alpha=0.85):
    """Vật liệu hologram: trong suốt + phát sáng mạnh ở rìa (fresnel)."""
    m = bpy.data.materials.new(name)
    try:
        m.use_nodes = True
    except Exception:
        pass
    nt = m.node_tree
    for n in list(nt.nodes):
        nt.nodes.remove(n)
    out = nt.nodes.new('ShaderNodeOutputMaterial')
    tr = nt.nodes.new('ShaderNodeBsdfTransparent')
    em = nt.nodes.new('ShaderNodeEmission')
    em.inputs['Color'].default_value = col
    lw = nt.nodes.new('ShaderNodeLayerWeight')
    lw.inputs['Blend'].default_value = 0.35
    mth = nt.nodes.new('ShaderNodeMath'); mth.operation = 'MULTIPLY'
    mth.inputs[1].default_value = s
    nt.links.new(lw.outputs['Facing'], mth.inputs[0])
    nt.links.new(mth.outputs[0], em.inputs['Strength'])
    add = nt.nodes.new('ShaderNodeAddShader')
    nt.links.new(tr.outputs[0], add.inputs[0])
    nt.links.new(em.outputs[0], add.inputs[1])
    nt.links.new(add.outputs[0], out.inputs[0])
    return m

def glass(name, tint=(0.9, 0.9, 1, 1), rough=0.02, rim=None, rim_s=2.0):
    m = mat(name, base=tint, metal=0, rough=rough, trans=1.0, ior=1.45)
    if rim:
        nt = m.node_tree
        b = _bsdf(m)
        out = [n for n in nt.nodes if n.type == 'OUTPUT_MATERIAL'][0]
        em = nt.nodes.new('ShaderNodeEmission')
        em.inputs['Color'].default_value = rim
        lw = nt.nodes.new('ShaderNodeLayerWeight')
        lw.inputs['Blend'].default_value = 0.3
        mth = nt.nodes.new('ShaderNodeMath'); mth.operation = 'MULTIPLY'
        mth.inputs[1].default_value = rim_s
        nt.links.new(lw.outputs['Facing'], mth.inputs[0])
        nt.links.new(mth.outputs[0], em.inputs['Strength'])
        add = nt.nodes.new('ShaderNodeAddShader')
        nt.links.new(b.outputs[0], add.inputs[0])
        nt.links.new(em.outputs[0], add.inputs[1])
        nt.links.new(add.outputs[0], out.inputs[0])
    return m

def link(o):
    bpy.context.scene.collection.objects.link(o)
    PARTS.append(o)
    return o

def from_bm(name, bm, m, loc=(0, 0, 0), rot=(0, 0, 0), smooth=True):
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    if smooth:
        for p in me.polygons:
            p.use_smooth = True
    o = link(bpy.data.objects.new(name, me))
    if m:
        me.materials.append(m)
    o.location = loc
    if isinstance(rot, Matrix):
        o.rotation_mode = 'QUATERNION'
        o.rotation_quaternion = rot.to_quaternion()
    elif len(rot) == 4:
        o.rotation_mode = 'QUATERNION'
        o.rotation_quaternion = rot
    else:
        o.rotation_euler = rot
    return o

def bevel(o, w=0.01, seg=3, angle=35, harden=True):
    md = o.modifiers.new('bev', 'BEVEL')
    md.width = w
    md.segments = seg
    md.limit_method = 'ANGLE'
    md.angle_limit = math.radians(angle)
    md.harden_normals = harden
    md.miter_outer = 'MITER_ARC'
    return o

def subsurf(o, lv=2):
    md = o.modifiers.new('sub', 'SUBSURF')
    md.levels = lv
    md.render_levels = lv
    return o

def box(name, size, loc, m, bev=0.012, seg=3, rot=(0, 0, 0)):
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    for v in bm.verts:
        v.co = Vector((v.co.x * size[0], v.co.y * size[1], v.co.z * size[2]))
    o = from_bm(name, bm, m, loc, rot)
    if bev:
        bevel(o, bev, seg)
    return o

def cyl(name, r, depth, loc, m, seg=48, r2=None, bev=0.008, bseg=3, rot=(0, 0, 0)):
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=True, cap_tris=False, segments=seg,
                          radius1=r, radius2=(r if r2 is None else r2), depth=depth)
    o = from_bm(name, bm, m, loc, rot)
    if bev:
        bevel(o, bev, bseg)
    return o

def cyl_between(name, p1, p2, r, m, r2=None, seg=24, bev=0.004):
    p1, p2 = Vector(p1), Vector(p2)
    d = p2 - p1
    q = d.to_track_quat('Z', 'Y')
    return cyl(name, r, d.length, (p1 + p2) / 2, m, seg=seg, r2=r2, bev=bev, rot=q)

def sphere(name, r, loc, m, seg=32, scale=(1, 1, 1)):
    bm = bmesh.new()
    bmesh.ops.create_uvsphere(bm, u_segments=seg, v_segments=seg // 2, radius=r)
    for v in bm.verts:
        v.co = Vector((v.co.x * scale[0], v.co.y * scale[1], v.co.z * scale[2]))
    return from_bm(name, bm, m, loc)

def torus(name, R, r, loc, m, rot=(0, 0, 0), seg=96, mseg=16):
    bm = bmesh.new()
    for i in range(seg):
        a = 2 * math.pi * i / seg
        for j in range(mseg):
            b = 2 * math.pi * j / mseg
            x = (R + r * math.cos(b)) * math.cos(a)
            y = (R + r * math.cos(b)) * math.sin(a)
            z = r * math.sin(b)
            bm.verts.new((x, y, z))
    bm.verts.ensure_lookup_table()
    for i in range(seg):
        for j in range(mseg):
            a = i * mseg + j
            b = ((i + 1) % seg) * mseg + j
            c = ((i + 1) % seg) * mseg + (j + 1) % mseg
            d = i * mseg + (j + 1) % mseg
            bm.faces.new((bm.verts[a], bm.verts[b], bm.verts[c], bm.verts[d]))
    return from_bm(name, bm, m, loc, rot)

def lathe(name, prof, m, seg=64, loc=(0, 0, 0), bev=0.0):
    bm = bmesh.new()
    vs = [bm.verts.new((r, 0, z)) for r, z in prof]
    es = [bm.edges.new((vs[i], vs[i + 1])) for i in range(len(vs) - 1)]
    bmesh.ops.spin(bm, geom=vs + es, cent=(0, 0, 0), axis=(0, 0, 1),
                   angle=2 * math.pi, steps=seg, use_merge=True)
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-5)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    o = from_bm(name, bm, m, loc)
    if bev:
        bevel(o, bev, 2, angle=30)
    return o

def hull(name, pts, m, loc=(0, 0, 0), mats2=None):
    bm = bmesh.new()
    vs = [bm.verts.new(p) for p in pts]
    r = bmesh.ops.convex_hull(bm, input=vs)
    bmesh.ops.delete(bm, geom=r['geom_interior'] + r['geom_unused'], context='VERTS')
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    if mats2:
        for i, f in enumerate(bm.faces):
            f.material_index = (i * 7 + int(f.normal.z * 3 + 3)) % 2
    o = from_bm(name, bm, None, loc, smooth=False)
    if mats2:
        o.data.materials.append(m)
        o.data.materials.append(mats2)
    else:
        o.data.materials.append(m)
    return o

def wire_copy(o, m, thick=0.006):
    c = o.copy()
    c.data = o.data.copy()
    c.data.materials.clear()
    c.data.materials.append(m)
    for p in c.data.polygons:
        p.material_index = 0
    c.modifiers.clear()
    bpy.context.scene.collection.objects.link(c)
    PARTS.append(c)
    w = c.modifiers.new('wire', 'WIREFRAME')
    w.thickness = thick
    w.use_replace = True
    w.use_even_offset = True
    return c

def text(name, body, size, loc, rot, m, extrude=0.008, bev=0.002, font=None):
    cu = bpy.data.curves.new(name, 'FONT')
    cu.body = body
    cu.size = size
    cu.extrude = extrude
    cu.bevel_depth = bev
    cu.align_x = 'CENTER'
    cu.align_y = 'CENTER'
    if font:
        cu.font = bpy.data.fonts.load(font)
    o = link(bpy.data.objects.new(name, cu))
    o.data.materials.append(m)
    o.location = loc
    o.rotation_euler = rot
    return o

def cable(name, pts, r, m):
    cu = bpy.data.curves.new(name, 'CURVE')
    cu.dimensions = '3D'
    cu.bevel_depth = r
    cu.bevel_resolution = 4
    sp = cu.splines.new('BEZIER')
    sp.bezier_points.add(len(pts) - 1)
    for bp, p in zip(sp.bezier_points, pts):
        bp.co = p
        bp.handle_left_type = bp.handle_right_type = 'AUTO'
    o = link(bpy.data.objects.new(name, cu))
    o.data.materials.append(m)
    return o

def plight(name, loc, col, w, r=0.05):
    L = bpy.data.lights.new(name, 'POINT')
    L.color = col[:3]
    L.energy = w
    L.shadow_soft_size = r
    o = link(bpy.data.objects.new(name, L))
    o.location = loc
    return o

# ---------- vật liệu chuẩn ----------
def std_mats(owner_hex):
    M = {}
    M['own'] = hexc(owner_hex)
    M['emit'] = emissive('emit', M['own'], 8.0)
    M['emit_lo'] = emissive('emit_lo', M['own'], 3.0)
    M['white'] = emissive('white', (1, 0.95, 0.9, 1), 5.0)
    M['chrome'] = mat('blackchrome', (0.03, 0.032, 0.04, 1), 1.0, 0.12, coat=0.6)
    M['steel'] = mat('steel', (0.55, 0.56, 0.6, 1), 1.0, 0.28, aniso=0.5, brushed=True)
    M['gun'] = mat('gunmetal', (0.06, 0.065, 0.08, 1), 1.0, 0.3, brushed=True)
    M['gold'] = mat('gold', hexc('#ffb81f', 0.95), 1.0, 0.2, aniso=0.3)
    M['rubber'] = mat('rubber', (0.01, 0.01, 0.012, 1), 0.0, 0.6)
    return M

def base(M, accent='steel'):
    """Đế tròn chung của bộ quân cờ."""
    cyl('base0', 0.66, 0.10, (0, 0, 0.05), M['chrome'], seg=96, bev=0.022)
    cyl('base1', 0.60, 0.04, (0, 0, 0.12), M['gun'], seg=96, bev=0.01)
    torus('baseRing', 0.628, 0.010, (0, 0, 0.102), M['emit'])
    torus('baseBand', 0.663, 0.006, (0, 0, 0.045), M['emit_lo'])
    for i in range(12):
        a = 2 * math.pi * i / 12 + math.pi / 12
        cyl('rivet%d' % i, 0.016, 0.012, (0.555 * math.cos(a), 0.555 * math.sin(a), 0.144),
            M[accent], seg=16, bev=0.004)
    for i in range(4):
        a = math.pi / 2 * i
        box('vent%d' % i, (0.09, 0.012, 0.035), (0.662 * math.cos(a), 0.662 * math.sin(a), 0.05),
            M['rubber'], bev=0.003, rot=(0, 0, a + math.pi / 2))

def emitter(M, r=0.22, z=T):
    cyl('emitHousing', r, 0.035, (0, 0, z + 0.0175), M['chrome'], seg=64, bev=0.008)
    cyl('emitCore', r * 0.72, 0.006, (0, 0, z + 0.036), M['emit_lo'], seg=64, bev=0)
    torus('emitLip', r * 0.86, 0.008, (0, 0, z + 0.035), M['steel'])

def group(rot_z=0.0):
    root = bpy.data.objects.new('root', None)
    bpy.context.scene.collection.objects.link(root)
    for o in PARTS:
        if o.parent is None and not o.name.startswith('base') and not o.name.startswith('rivet') \
                and not o.name.startswith('vent'):
            o.parent = root
    root.rotation_euler = (0, 0, rot_z)
    return root

# ---------- cảnh, đèn, camera ----------
def scene_setup(owner_hex, samples=64, res=512):
    s = bpy.context.scene
    s.render.engine = 'CYCLES'
    s.cycles.device = 'CPU'
    s.cycles.samples = samples
    s.cycles.use_adaptive_sampling = True
    s.cycles.adaptive_threshold = 0.02
    s.cycles.use_denoising = True
    try:
        s.cycles.denoiser = 'OPENIMAGEDENOISE'
    except Exception:
        pass
    s.cycles.max_bounces = 8
    s.cycles.transmission_bounces = 8
    s.cycles.transparent_max_bounces = 16
    s.cycles.glossy_bounces = 4
    s.cycles.diffuse_bounces = 2
    s.cycles.caustics_reflective = False
    s.cycles.caustics_refractive = False
    s.cycles.blur_glossy = 1.0
    s.render.film_transparent = True
    s.render.resolution_x = s.render.resolution_y = res
    s.render.image_settings.file_format = 'PNG'
    s.render.image_settings.color_mode = 'RGBA'
    try:
        s.view_settings.view_transform = 'AgX'
        s.view_settings.look = 'AgX - Medium High Contrast'
    except Exception:
        pass
    # world: gradient tối cho phản chiếu kim loại
    w = bpy.data.worlds.new('w')
    s.world = w
    try:
        w.use_nodes = True
    except Exception:
        pass
    nt = w.node_tree
    bg = nt.nodes.get('Background') or nt.nodes.new('ShaderNodeBackground')
    outs = [n for n in nt.nodes if n.type == 'OUTPUT_WORLD']
    out = outs[0] if outs else nt.nodes.new('ShaderNodeOutputWorld')
    nt.links.new(bg.outputs[0], out.inputs[0])
    tc = nt.nodes.new('ShaderNodeTexCoord')
    sep = nt.nodes.new('ShaderNodeSeparateXYZ')
    cr = nt.nodes.new('ShaderNodeValToRGB')
    cr.color_ramp.elements[0].position = 0.45
    cr.color_ramp.elements[0].color = (0.004, 0.007, 0.02, 1)
    cr.color_ramp.elements[1].position = 1.0
    cr.color_ramp.elements[1].color = (0.12, 0.14, 0.22, 1)
    mr = nt.nodes.new('ShaderNodeMapRange')
    mr.inputs['From Min'].default_value = -1
    mr.inputs['From Max'].default_value = 1
    nt.links.new(tc.outputs['Normal'], sep.inputs[0])
    nt.links.new(sep.outputs['Z'], mr.inputs['Value'])
    nt.links.new(mr.outputs['Result'], cr.inputs['Fac'])
    nt.links.new(cr.outputs['Color'], bg.inputs['Color'])
    bg.inputs['Strength'].default_value = 1.0

    own = hexc(owner_hex)
    def area(name, loc, w_, size, col=(1, 1, 1)):
        L = bpy.data.lights.new(name, 'AREA')
        L.energy = w_
        L.size = size
        L.color = col[:3]
        o = bpy.data.objects.new(name, L)
        s.collection.objects.link(o)
        o.location = loc
        d = Vector((0, 0, 0.45)) - Vector(loc)
        o.rotation_mode = 'QUATERNION'
        o.rotation_quaternion = d.to_track_quat('-Z', 'Y')
        return o
    area('key', (-1.2, -2.4, 2.9), 200, 1.6, (1.0, 0.96, 0.9))
    area('fill', (2.6, -0.4, 1.3), 70, 2.2, (0.75, 0.82, 1.0))
    area('top', (0, 0, 3.6), 45, 3.0)
    rim = tuple(0.45 + 0.55 * c for c in own[:3])
    area('rim', (1.0, 2.6, 1.5), 320, 1.0, rim)
    area('rim2', (-2.4, 1.0, 1.1), 160, 1.0, (0.7, 0.8, 1.0))

def camera_fit(ortho=None, el=35, az=45, margin=1.10):
    s = bpy.context.scene
    bpy.context.view_layer.update()
    cd = bpy.data.cameras.new('cam')
    cd.type = 'ORTHO'
    cam = bpy.data.objects.new('cam', cd)
    s.collection.objects.link(cam)
    s.camera = cam
    e, a = math.radians(el), math.radians(az)
    dirv = Vector((math.sin(a) * math.cos(e), -math.cos(a) * math.cos(e), math.sin(e)))
    q = (-dirv).to_track_quat('-Z', 'Y')
    R = q.to_matrix()
    right, up = R.col[0], R.col[1]
    dg = bpy.context.evaluated_depsgraph_get()
    xs, ys = [], []
    for o in PARTS:
        if o.type not in ('MESH', 'FONT') or o.hide_render:
            continue
        oe = o.evaluated_get(dg)
        for c in oe.bound_box:
            p = oe.matrix_world @ Vector(c)
            xs.append(p.dot(right)); ys.append(p.dot(up))
    cx, cy = (min(xs) + max(xs)) / 2, (min(ys) + max(ys)) / 2
    span = max(max(xs) - min(xs), max(ys) - min(ys)) * margin
    cd.ortho_scale = max(ortho or 0, span)
    cam.location = right * cx + up * cy + dirv * 10
    cam.rotation_mode = 'QUATERNION'
    cam.rotation_quaternion = q
    cd.clip_end = 50
    return cam

def render(path):
    s = bpy.context.scene
    s.render.filepath = path
    bpy.ops.render.render(write_still=True)
