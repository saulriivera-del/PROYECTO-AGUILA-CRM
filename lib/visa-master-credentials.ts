import 'server-only'

import crypto from 'crypto'

type EncryptedCredential = {
  ciphertext: string
  iv: string
  authTag: string
}

function getKey() {
  const raw = process.env.VM_CREDENTIAL_ENCRYPTION_KEY
  if (!raw) {
    throw new Error('Falta VM_CREDENTIAL_ENCRYPTION_KEY en las variables de entorno.')
  }

  const key = Buffer.from(raw, 'base64')
  if (key.length !== 32) {
    throw new Error('VM_CREDENTIAL_ENCRYPTION_KEY debe ser una llave Base64 de 32 bytes.')
  }

  return key
}

export function encryptVisaCredential(value: string): EncryptedCredential {
  if (!value) throw new Error('La contraseña no puede estar vacía.')

  const key = getKey()
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv)

  const encrypted = Buffer.concat([
    cipher.update(value, 'utf8'),
    cipher.final(),
  ])

  return {
    ciphertext: encrypted.toString('base64'),
    iv: iv.toString('base64'),
    authTag: cipher.getAuthTag().toString('base64'),
  }
}

export function decryptVisaCredential(
  ciphertext: string,
  iv: string,
  authTag: string,
) {
  const key = getKey()
  const decipher = crypto.createDecipheriv(
    'aes-256-gcm',
    key,
    Buffer.from(iv, 'base64'),
  )

  decipher.setAuthTag(Buffer.from(authTag, 'base64'))

  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(ciphertext, 'base64')),
    decipher.final(),
  ])

  return decrypted.toString('utf8')
}
