import { useCallback, useEffect, useRef, useState } from 'react'
import { reportsApi } from '../services/api'

const ESTADO_POR_RESULTADO = {
  aprovada: 'aprovada',
  indisponivel: 'indisponivel',
  bloqueada_impropria: 'bloqueada',
  bloqueada_fora_escopo: 'bloqueada',
}

const ESTADOS_QUE_IMPEDEM_AVANCAR = ['analisando', 'bloqueada', 'erro']

export function useImageAnalysis() {
  const [estado, setEstado] = useState('idle')
  const [mensagem, setMensagem] = useState('')
  const [analiseId, setAnaliseId] = useState(null)
  const controllerRef = useRef(null)

  const cancelar = useCallback(() => {
    controllerRef.current?.abort()
    controllerRef.current = null
  }, [])

  useEffect(() => cancelar, [cancelar])

  const limpar = useCallback(() => {
    cancelar()
    setEstado('idle')
    setMensagem('')
    setAnaliseId(null)
  }, [cancelar])

  const analisar = useCallback(async (arquivo) => {
    cancelar()
    const controller = new AbortController()
    controllerRef.current = controller

    setEstado('analisando')
    setMensagem('')
    setAnaliseId(null)

    try {
      const fd = new FormData()
      fd.append('imagem', arquivo)
      const { data } = await reportsApi.analisar(fd, controller.signal)
      const analise = data.data

      setEstado(ESTADO_POR_RESULTADO[analise.resultado] || 'erro')
      setMensagem(analise.motivo)
      setAnaliseId(analise.analise_id)
      return analise
    } catch (err) {
      if (controller.signal.aborted) return null

      setEstado('erro')
      setMensagem(err.response?.data?.mensagem || 'Não foi possível analisar a foto. Tente novamente ou remova-a.')
      return null
    }
  }, [cancelar])

  return {
    estado,
    mensagem,
    analiseId,
    podeAvancar: !ESTADOS_QUE_IMPEDEM_AVANCAR.includes(estado),
    analisar,
    limpar,
  }
}
