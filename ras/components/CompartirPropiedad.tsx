'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import Modal from '@/components/ui/modal'
import Input from '@/components/ui/input'
import Button from '@/components/ui/button'

interface CompartirPropiedadProps {
  isOpen: boolean
  onClose: () => void
  propiedadId: string
  propiedadNombre: string
  userId: string
  esPropio: boolean
}

interface Colaborador {
  id: string
  user_id: string | null
  email: string
  full_name?: string
  pendiente?: boolean
}

export default function CompartirPropiedad({
  isOpen,
  onClose,
  propiedadId,
  propiedadNombre,
  userId,
  esPropio
}: CompartirPropiedadProps) {
  const [colaboradores, setColaboradores] = useState<Colaborador[]>([])
  const [emailColaborador, setEmailColaborador] = useState('')
  const [agregando, setAgregando] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (isOpen && esPropio) {
      cargarColaboradores()
    }
  }, [isOpen, propiedadId, esPropio])

  const cargarColaboradores = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('propiedades_colaboradores')
        .select('id, user_id, email_invitado')
        .eq('propiedad_id', propiedadId)

      if (error) {
        console.error('Error al cargar colaboradores:', error)
        setLoading(false)
        return
      }

      // Cargar datos de perfil de cada colaborador
      const colaboradoresConDatos = await Promise.all(
        (data || []).map(async (colab: any) => {
          // Si tiene user_id, buscar en profiles
          if (colab.user_id) {
            const { data: perfil } = await supabase
              .from('profiles')
              .select('email, full_name')
              .eq('id', colab.user_id)
              .maybeSingle()

            return {
              id: colab.id,
              user_id: colab.user_id,
              email: perfil?.email || colab.email_invitado || 'Sin email',
              full_name: perfil?.full_name,
              pendiente: false
            }
          } else {
            // Si no tiene user_id, es una invitación pendiente
            return {
              id: colab.id,
              user_id: null,
              email: colab.email_invitado || 'Sin email',
              full_name: null,
              pendiente: true
            }
          }
        })
      )

      console.log('Colaboradores cargados:', colaboradoresConDatos)
      setColaboradores(colaboradoresConDatos)
    } catch (error) {
      console.error('Error al cargar colaboradores:', error)
    } finally {
      setLoading(false)
    }
  }

  const agregarColaborador = async (e: React.FormEvent) => {
    e.preventDefault()
    setAgregando(true)

    try {
      const emailBuscar = emailColaborador.trim().toLowerCase()

      // Validar formato de email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(emailBuscar)) {
        alert('❌ Email inválido')
        setAgregando(false)
        return
      }

      // No validar si existe el usuario - permitir agregar cualquier email
      // La asociación se hará cuando el usuario se registre con ese email

      // Buscar si el usuario YA existe (opcional, pero no requerido)
      const { data: perfilData } = await supabase
        .from('profiles')
        .select('id, email')
        .eq('email', emailBuscar)
        .maybeSingle()

      // Si el usuario existe y es el propietario, no permitir
      if (perfilData && perfilData.id === userId) {
        alert('❌ No puedes agregarte a ti mismo')
        setAgregando(false)
        return
      }

      // Agregar colaborador con user_id si existe, o NULL si no existe aún
      const { error: insertError } = await supabase
        .from('propiedades_colaboradores')
        .insert({
          propiedad_id: propiedadId,
          user_id: perfilData?.id || null,  // NULL si no existe aún
          email_invitado: emailBuscar,      // Guardar el email para cuando se registre
          agregado_por: userId
        })

      if (insertError) {
        if (insertError.code === '23505') {
          alert('⚠️ Este email ya está invitado')
        } else {
          alert('❌ Error: ' + insertError.message)
        }
        setAgregando(false)
      } else {
        setEmailColaborador('')
        alert(perfilData
          ? '✅ Colaborador agregado correctamente'
          : '✅ Invitación enviada. Tendrá acceso cuando se registre con este email'
        )
        // Recargar colaboradores después de agregar
        await cargarColaboradores()
        setAgregando(false)
      }
    } catch (err) {
      alert('❌ Error: ' + (err as Error).message)
    } finally {
      setAgregando(false)
    }
  }

  const eliminarColaborador = async (colaboradorId: string, emailColab: string) => {
    if (!confirm(`¿Eliminar a ${emailColab} de esta propiedad?`)) return

    try {
      const { error } = await supabase
        .from('propiedades_colaboradores')
        .delete()
        .eq('id', colaboradorId)

      if (error) throw error

      alert('✅ Colaborador eliminado')
      cargarColaboradores()
    } catch (err) {
      alert('❌ Error al eliminar colaborador')
      console.error(err)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="2xl">
      <h2 className="text-3xl font-bold mb-2 font-poppins text-gray-800">
        {propiedadNombre}
      </h2>
      <p className="text-gray-500 mb-8 font-roboto">
        {esPropio ? '🏠 Tu propiedad' : '👥 Compartido contigo'}
      </p>

      {esPropio ? (
        <>
          <h3 className="text-xl font-semibold mb-4 font-poppins text-gray-800">
            Colaboradores
          </h3>

          {/* Formulario agregar colaborador */}
          <form onSubmit={agregarColaborador} className="mb-6">
            <div className="flex gap-2">
              <Input
                type="email"
                value={emailColaborador}
                onChange={(e) => setEmailColaborador(e.target.value)}
                placeholder="Email del colaborador"
                required
                className="flex-1"
              />
              <Button type="submit" disabled={agregando} size="md">
                {agregando ? 'Agregando...' : 'Agregar'}
              </Button>
            </div>
          </form>

          {/* Lista de colaboradores */}
          {loading ? (
            <div className="text-center py-8 text-gray-500">Cargando...</div>
          ) : colaboradores.length > 0 ? (
            <div className="space-y-3">
              {colaboradores.map((colab) => (
                <div
                  key={colab.id}
                  className={`flex justify-between items-center p-4 rounded-xl border ${
                    colab.pendiente
                      ? 'bg-yellow-50 border-yellow-200'
                      : 'bg-gray-50 border-gray-200'
                  }`}
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-800 font-roboto">
                        {colab.email}
                      </span>
                      {colab.pendiente && (
                        <span className="text-xs px-2 py-0.5 bg-yellow-200 text-yellow-800 rounded-full font-medium">
                          Pendiente
                        </span>
                      )}
                    </div>
                    {colab.full_name && (
                      <div className="text-sm text-gray-500 font-roboto mt-1">
                        {colab.full_name}
                      </div>
                    )}
                    {colab.pendiente && (
                      <div className="text-xs text-gray-500 font-roboto mt-1">
                        Tendrá acceso cuando se registre
                      </div>
                    )}
                  </div>
                  <Button
                    onClick={() => eliminarColaborador(colab.id, colab.email)}
                    variant="danger"
                    size="sm"
                  >
                    Eliminar
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-400 font-roboto">
              <svg
                className="w-16 h-16 mx-auto mb-4 opacity-30"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
              <p>Aún no has agregado colaboradores</p>
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-8 text-gray-500 font-roboto">
          Esta propiedad fue compartida contigo por otro usuario.
        </div>
      )}

      <div className="mt-8">
        <Button onClick={onClose} variant="secondary" className="w-full">
          Cerrar
        </Button>
      </div>
    </Modal>
  )
}