const TABLE_NAME = 'guest_visits'
const PHOTO_BUCKET = 'guest-photos'

function getErrorMessage(error) {
  return error instanceof Error ? error.message : String(error)
}

function toDatabaseRecord(formData) {
  return {
    full_name: formData.fullName,
    organization: formData.organization,
    visit_purpose: formData.visitPurpose,
    people_count: Number(formData.peopleCount),
    visit_date: formData.visitDate,
    arrival_time: formData.arrivalTime,
    departure_time: formData.departureTime,
  }
}

async function getSignedPhotoUrl(client, photoPath) {
  const { data, error } = await client.storage
    .from(PHOTO_BUCKET)
    .createSignedUrl(photoPath, 60 * 60)

  if (error) {
    throw new Error(`Gagal membuka foto kunjungan: ${error.message}`)
  }

  return data.signedUrl
}

async function mapDatabaseRecord(client, record) {
  return {
    id: record.id,
    fullName: record.full_name,
    organization: record.organization,
    visitPurpose: record.visit_purpose,
    peopleCount: Number(record.people_count),
    visitDate: record.visit_date,
    arrivalTime: record.arrival_time.slice(0, 5),
    departureTime: record.departure_time.slice(0, 5),
    arrivedAt: record.arrived_at,
    departedAt: record.departed_at,
    photoPath: record.photo_path,
    photoName: record.photo_path.split('/').pop(),
    photoUrl: await getSignedPhotoUrl(client, record.photo_path),
  }
}

async function uploadPhoto(client, photo) {
  const extension = photo.name.split('.').pop()?.replace(/[^a-zA-Z0-9]/g, '').toLowerCase()
  const photoPath = `${crypto.randomUUID()}${extension ? `.${extension}` : ''}`
  const { error } = await client.storage
    .from(PHOTO_BUCKET)
    .upload(photoPath, photo, {
      cacheControl: '3600',
      contentType: photo.type,
      upsert: false,
    })

  if (error) {
    throw new Error(`Gagal mengunggah foto. Periksa bucket "${PHOTO_BUCKET}" dan izinnya: ${error.message}`)
  }

  return photoPath
}

export async function fetchGuestVisits(client) {
  const { data, error } = await client
    .from(TABLE_NAME)
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(
      `Gagal mengambil data dari tabel "${TABLE_NAME}". Pastikan tabel dan kebijakan RLS sudah dibuat: ${error.message}`,
    )
  }

  return Promise.all(data.map((record) => mapDatabaseRecord(client, record)))
}

export async function createGuestVisit(client, formData, photo) {
  const photoPath = await uploadPhoto(client, photo)
  const { data, error } = await client
    .from(TABLE_NAME)
    .insert({
      ...toDatabaseRecord(formData),
      photo_path: photoPath,
      arrived_at: null,
      departed_at: null,
    })
    .select()
    .single()

  if (error) {
    const { error: cleanupError } = await client.storage
      .from(PHOTO_BUCKET)
      .remove([photoPath])
    const cleanupMessage = cleanupError
      ? ` Foto gagal dibersihkan: ${cleanupError.message}`
      : ''
    throw new Error(`Gagal menyimpan data kunjungan: ${error.message}.${cleanupMessage}`)
  }

  return mapDatabaseRecord(client, data)
}

export async function updateGuestVisit(client, guest, formData, photo) {
  const replacementPhotoPath = photo ? await uploadPhoto(client, photo) : null
  const { data, error } = await client
    .from(TABLE_NAME)
    .update({
      ...toDatabaseRecord(formData),
      ...(replacementPhotoPath ? { photo_path: replacementPhotoPath } : {}),
    })
    .eq('id', guest.id)
    .select()
    .single()

  if (error) {
    if (replacementPhotoPath) {
      const { error: cleanupError } = await client.storage
        .from(PHOTO_BUCKET)
        .remove([replacementPhotoPath])
      if (cleanupError) {
        throw new Error(
          `Gagal memperbarui kunjungan: ${error.message}. Foto baru juga gagal dibersihkan: ${cleanupError.message}`,
        )
      }
    }
    throw new Error(`Gagal memperbarui data kunjungan: ${error.message}`)
  }

  const updatedGuest = await mapDatabaseRecord(client, data)
  let warning = ''

  if (replacementPhotoPath) {
    const { error: cleanupError } = await client.storage
      .from(PHOTO_BUCKET)
      .remove([guest.photoPath])
    if (cleanupError) {
      warning = `Data berhasil diperbarui, tetapi foto lama gagal dihapus: ${cleanupError.message}`
    }
  }

  return { guest: updatedGuest, warning }
}

export async function updateGuestVisitStatus(client, guestId, status) {
  const timestamp = new Date().toISOString()
  const statusFields =
    status === 'arrived'
      ? { arrived_at: timestamp }
      : { departed_at: timestamp }
  const { error } = await client
    .from(TABLE_NAME)
    .update(statusFields)
    .eq('id', guestId)

  if (error) {
    throw new Error(`Gagal memperbarui status kunjungan: ${error.message}`)
  }

  return timestamp
}

export async function deleteGuestVisit(client, guest) {
  const { error } = await client.from(TABLE_NAME).delete().eq('id', guest.id)

  if (error) {
    throw new Error(`Gagal menghapus data kunjungan: ${error.message}`)
  }

  const { error: photoError } = await client.storage
    .from(PHOTO_BUCKET)
    .remove([guest.photoPath])

  return photoError
    ? `Catatan berhasil dihapus, tetapi foto gagal dihapus: ${photoError.message}`
    : ''
}

export function getSupabaseErrorMessage(error) {
  return getErrorMessage(error)
}
