import { useEffect, useState } from 'react'
import { AlertTriangle, CheckCircle, Image, Loader, RefreshCw, ShieldAlert, X } from 'lucide-react'

const AVISOS = {
  analisando: { fundo:'var(--brand-dim)', borda:'var(--brand-border)', cor:'var(--brand)', Icone:Loader },
  aprovada: { fundo:'#DCFCE7', borda:'#86EFAC', cor:'#15803D', Icone:CheckCircle },
  indisponivel: { fundo:'#FEF3C7', borda:'#FCD34D', cor:'#92400E', Icone:AlertTriangle },
  bloqueada: { fundo:'#FEE2E2', borda:'#FCA5A5', cor:'#B91C1C', Icone:ShieldAlert },
  erro: { fundo:'#FEE2E2', borda:'#FCA5A5', cor:'#B91C1C', Icone:AlertTriangle },
}

export default function PhotoAnalysisStep({ preview, nomeArquivo, estado, mensagem, sugestoesAtivas, onSelect, onRemove, onRetry, onIgnorar }) {
  const [previewFalhou, setPreviewFalhou] = useState(false)

  useEffect(() => { setPreviewFalhou(false) }, [preview])

  const aviso = AVISOS[estado]
  const texto = estado === 'analisando' ? 'Analisando a foto...' : mensagem

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
      <div>
        <p style={{ fontSize:13, fontWeight:600, color:'var(--text2)', marginBottom:4, letterSpacing:.3 }}>FOTO DA OCORRÊNCIA (OPCIONAL)</p>
        <p style={{ fontSize:13, color:'var(--text3)' }}>Com uma foto, sugerimos o preenchimento dos próximos passos. Você pode editar tudo.</p>
      </div>

      {preview ? (
        <div style={{ position:'relative' }}>
          {previewFalhou ? (
            <div style={{ height:200, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:8, padding:16, borderRadius:10, border:'1px solid var(--border)', background:'var(--bg3)', color:'var(--text3)' }}>
              <Image size={24}/>
              <span style={{ fontSize:13, wordBreak:'break-all', textAlign:'center' }}>{nomeArquivo}</span>
            </div>
          ) : (
            <img src={preview} alt="Foto anexada" onError={()=>setPreviewFalhou(true)} style={{ width:'100%', height:200, objectFit:'cover', borderRadius:10, border:'1px solid var(--border)' }}/>
          )}
          <button type="button" onClick={onRemove} aria-label="Remover foto" style={{ position:'absolute', top:8, right:8, background:'rgba(0,0,0,.6)', border:'none', borderRadius:'50%', width:32, height:32, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:'white' }}>
            <X size={14}/>
          </button>
        </div>
      ) : (
        <label style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:8, padding:32, border:'1.5px dashed var(--border2)', borderRadius:10, cursor:'pointer', background:'var(--bg3)', color:'var(--text3)' }}>
          <Image size={28}/>
          <span style={{ fontSize:14 }}>Clique para adicionar foto</span>
          <span style={{ fontSize:11 }}>JPEG, PNG, WebP, HEIC ou HEIF · máx 15MB</span>
          <input type="file" accept="image/jpeg,image/png,image/webp,.heic,.heif" onChange={onSelect} style={{ display:'none' }}/>
        </label>
      )}

      {aviso && (
        <div role={estado === 'bloqueada' || estado === 'erro' ? 'alert' : 'status'} style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 14px', borderRadius:9, background:aviso.fundo, border:`1px solid ${aviso.borda}`, color:aviso.cor, fontSize:13, fontWeight:500 }}>
          <aviso.Icone size={16} style={{ flexShrink:0, animation:estado === 'analisando' ? 'spin .8s linear infinite' : 'none' }}/>
          <span style={{ flex:1 }}>{texto}</span>
          {estado === 'erro' && (
            <button type="button" onClick={onRetry} style={linkBotao(aviso.cor)}>
              <RefreshCw size={13}/> Tentar novamente
            </button>
          )}
          {estado === 'aprovada' && sugestoesAtivas && (
            <button type="button" onClick={onIgnorar} style={linkBotao(aviso.cor)}>Ignorar sugestões</button>
          )}
        </div>
      )}
    </div>
  )
}

const linkBotao = (cor) => ({ display:'flex', alignItems:'center', gap:5, flexShrink:0, background:'none', border:'none', padding:0, color:cor, fontSize:13, fontWeight:600, fontFamily:'var(--font-body)', textDecoration:'underline', cursor:'pointer' })
