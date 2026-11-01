// Direct-to-S3 upload hop — a bare axios instance, never the shared `api` one (its baseURL
// prefixing, auth cookies, and 401-refresh interceptor would all be unsafe against S3).
import axios from 'axios'

const plainAxios = axios.create()

// uploadUrl is the presigned PUT from POST /files; expires in 1hr per the backend contract.
export const uploadFileToS3 = async (uploadUrl: string, file: File): Promise<void> => {
  await plainAxios.put(uploadUrl, file, {
    headers: { 'Content-Type': file.type },
  })
}
