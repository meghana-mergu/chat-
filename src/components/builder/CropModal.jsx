import { useState, useEffect, useRef, useCallback } from 'react'

export default function CropModal({ src, onApply, onCancel }) {
  const wrapRef = useRef(null)
  const imgRef  = useRef(null)
  const st      = useRef({ natW: 0, natH: 0, ox: 0, oy: 0, scale: 1, drag: null })
  const [zoom, setZoom]     = useState(1)
  const [bounds, setBounds] = useState({ min: 0.3, max: 4 })
  const W = 220, H = 220

  const applyT = useCallback(() => {
    const { natW, natH, ox, oy, scale } = st.current
    if (!imgRef.current) return
    Object.assign(imgRef.current.style, {
      width:  natW * scale + 'px',
      height: natH * scale + 'px',
      left:   ox   + 'px',
      top:    oy   + 'px',
    })
  }, [])

  useEffect(() => {
    const img = new Image()
    img.onload = () => {
      const s = st.current
      s.natW = img.naturalWidth
      s.natH = img.naturalHeight
      s.scale = Math.max(W / s.natW, H / s.natH)
      s.ox = (W - s.natW * s.scale) / 2
      s.oy = (H - s.natH * s.scale) / 2
      setBounds({ min: Math.max(0.3, s.scale * 0.5), max: s.scale * 4 })
      setZoom(s.scale)
      applyT()
    }
    img.src = src
  }, [src, applyT])

  useEffect(() => {
    const onMove = e => {
      const s = st.current
      if (!s.drag) return
      s.ox = e.clientX - s.drag.sx
      s.oy = e.clientY - s.drag.sy
      applyT()
    }
    const onUp = () => { st.current.drag = null }
    const onWheel = e => {
      e.preventDefault()
      const s  = st.current
      const d  = e.deltaY > 0 ? -0.07 : 0.07
      const cx = W / 2, cy = H / 2
      const ix = (cx - s.ox) / s.scale
      const iy = (cy - s.oy) / s.scale
      s.scale = Math.max(bounds.min, Math.min(bounds.max, s.scale + d))
      s.ox = cx - ix * s.scale
      s.oy = cy - iy * s.scale
      setZoom(s.scale)
      applyT()
    }
    const wrap = wrapRef.current
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    wrap?.addEventListener('wheel', onWheel, { passive: false })
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
      wrap?.removeEventListener('wheel', onWheel)
    }
  }, [bounds, applyT])

  const handleSlider = v => {
    const s = st.current
    const cx = W / 2, cy = H / 2
    const ix = (cx - s.ox) / s.scale
    const iy = (cy - s.oy) / s.scale
    s.scale = v
    s.ox = cx - ix * v
    s.oy = cy - iy * v
    setZoom(v)
    applyT()
  }

  const apply = () => {
    const s = st.current
    const c = document.createElement('canvas')
    c.width = 200; c.height = 200
    const ctx = c.getContext('2d')
    ctx.beginPath()
    ctx.arc(100, 100, 100, 0, Math.PI * 2)
    ctx.clip()
    const r = 100, cx = W / 2, cy = H / 2
    const sx = (cx - r - s.ox) / s.scale
    const sy = (cy - r - s.oy) / s.scale
    const ss = (r * 2) / s.scale
    const img = new Image()
    img.src = src
    img.onload = () => {
      ctx.drawImage(img, sx, sy, ss, ss, 0, 0, 200, 200)
      onApply(c.toDataURL('image/png'))
    }
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/85 backdrop-blur-md">
      <div className="crop-in flex flex-col items-center gap-4 rounded-3xl border border-rose-900/30 bg-gradient-to-br from-[#2d0a0a] to-[#1a0505] p-7 shadow-2xl">
        <p className="text-lg font-extrabold text-rose-200">Crop your photo ✂️</p>
        <p className="-mt-2 text-xs text-rose-300/70">Drag · Scroll to zoom</p>

        {/* Crop canvas */}
        <div
          ref={wrapRef}
          onMouseDown={e => {
            st.current.drag = { sx: e.clientX - st.current.ox, sy: e.clientY - st.current.oy }
            e.preventDefault()
          }}
          className="relative overflow-hidden rounded-2xl bg-[#0d0404] cursor-grab active:cursor-grabbing select-none"
          style={{ width: W, height: H }}
        >
          <img
            ref={imgRef}
            src={src}
            alt=""
            draggable={false}
            className="absolute max-w-none pointer-events-none select-none"
          />
          {/* Overlay mask */}
          <div className="absolute inset-0 pointer-events-none">
            <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full">
              <defs>
                <mask id="crop-mask">
                  <rect width={W} height={H} fill="white" />
                  <circle cx={W / 2} cy={H / 2} r={H / 2 - 10} fill="black" />
                </mask>
              </defs>
              <rect width={W} height={H} fill="rgba(10,0,0,0.6)" mask="url(#crop-mask)" />
              <circle
                cx={W / 2} cy={H / 2} r={H / 2 - 10}
                fill="none" stroke="#c45a5a" strokeWidth={2} strokeDasharray="6 3"
              />
            </svg>
          </div>
        </div>

        {/* Zoom slider */}
        <div className="flex w-full items-center gap-3">
          <span className="text-xs text-rose-200">Zoom</span>
          <input
            type="range"
            min={bounds.min} max={bounds.max} step={0.05} value={zoom}
            onChange={e => handleSlider(parseFloat(e.target.value))}
            className="flex-1 accent-rose-500 cursor-pointer"
          />
          <span className="w-9 text-right text-xs text-rose-200">{zoom.toFixed(1)}×</span>
        </div>

        {/* Buttons */}
        <div className="flex w-full gap-3">
          <button
            onClick={onCancel}
            className="flex-1 rounded-xl border border-white/15 bg-white/10 py-2.5 text-sm font-bold text-rose-200 hover:bg-white/20 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={apply}
            className="flex-1 rounded-xl bg-gradient-to-r from-rose-500 to-pink-500 py-2.5 text-sm font-bold text-white shadow-lg hover:from-rose-600 hover:to-pink-600 transition-colors cursor-pointer"
          >
            Apply ✓
          </button>
        </div>
      </div>
    </div>
  )
}
