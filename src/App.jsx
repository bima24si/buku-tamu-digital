import { useMemo, useRef, useState } from 'react'

const emptyForm = {
  fullName: '',
  organization: '',
  visitPurpose: '',
  peopleCount: '1',
  visitDate: '',
  arrivalTime: '',
  departureTime: '',
}

function Icon({ children, className = 'h-5 w-5' }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.8"
      viewBox="0 0 24 24"
    >
      {children}
    </svg>
  )
}

function Field({ label, name, icon, ...inputProps }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold text-slate-700">{label}</span>
      <span className="relative block">
        {icon && (
          <span className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center text-slate-400">
            {icon}
          </span>
        )}
        <input
          className={`h-12 w-full rounded-xl border border-slate-200 bg-white text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 ${
            icon ? 'pl-11 pr-4' : 'px-4'
          }`}
          name={name}
          {...inputProps}
        />
      </span>
    </label>
  )
}

function App() {
  const [formData, setFormData] = useState(emptyForm)
  const [guests, setGuests] = useState([])
  const [photo, setPhoto] = useState(null)
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState(null)
  const [photoError, setPhotoError] = useState('')
  const [activePage, setActivePage] = useState('home')
  const [searchQuery, setSearchQuery] = useState('')
  const [editingGuestId, setEditingGuestId] = useState(null)
  const [deleteGuestId, setDeleteGuestId] = useState(null)
  const fileInputRef = useRef(null)
  const editingGuest = guests.find((guest) => guest.id === editingGuestId)

  function handleChange(event) {
    const { name, value } = event.target
    setFormData((currentForm) => ({ ...currentForm, [name]: value }))
  }

  function handlePhotoChange(event) {
    const selectedFile = event.target.files?.[0] ?? null

    if (selectedFile && !selectedFile.type.startsWith('image/')) {
      if (photoPreviewUrl) URL.revokeObjectURL(photoPreviewUrl)
      setPhoto(null)
      setPhotoPreviewUrl(null)
      setPhotoError('File harus berupa gambar.')
      event.target.value = ''
      return
    }

    if (photoPreviewUrl) URL.revokeObjectURL(photoPreviewUrl)
    setPhoto(selectedFile)
    setPhotoPreviewUrl(selectedFile ? URL.createObjectURL(selectedFile) : null)
    setPhotoError('')
  }

  function handleSubmit(event) {
    event.preventDefault()

    if (!photo && !editingGuest) {
      setPhotoError('Silakan lampirkan foto kunjungan terlebih dahulu.')
      return
    }

    if (editingGuest) {
      setGuests((currentGuests) =>
        currentGuests.map((guest) =>
          guest.id === editingGuest.id
            ? {
                ...guest,
                ...formData,
              peopleCount: Number(formData.peopleCount),
              photoName: photo?.name ?? guest.photoName,
              photoUrl: photoPreviewUrl ?? guest.photoUrl,
              }
            : guest,
        ),
      )

      if (photo) URL.revokeObjectURL(editingGuest.photoUrl)
    } else {
      setGuests((currentGuests) => [
        {
          ...formData,
          id: crypto.randomUUID(),
          peopleCount: Number(formData.peopleCount),
          arrivedAt: null,
          departedAt: null,
          photoName: photo.name,
          photoUrl: photoPreviewUrl,
        },
        ...currentGuests,
      ])
    }

    setFormData(emptyForm)
    setPhoto(null)
    setPhotoPreviewUrl(null)
    setPhotoError('')
    setEditingGuestId(null)

    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }

    setActivePage('guests')
  }

  function handleEditGuest(guest) {
    if (photoPreviewUrl) URL.revokeObjectURL(photoPreviewUrl)
    setFormData({
      fullName: guest.fullName,
      organization: guest.organization,
      visitPurpose: guest.visitPurpose,
      peopleCount: guest.peopleCount,
      visitDate: guest.visitDate,
      arrivalTime: guest.arrivalTime,
      departureTime: guest.departureTime,
    })
    setPhoto(null)
    setPhotoPreviewUrl(null)
    setPhotoError('')
    setEditingGuestId(guest.id)
    setSearchQuery('')
    setActivePage('form')

    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  function handleCancelEdit() {
    if (photoPreviewUrl) URL.revokeObjectURL(photoPreviewUrl)
    setFormData(emptyForm)
    setPhoto(null)
    setPhotoPreviewUrl(null)
    setPhotoError('')
    setEditingGuestId(null)

    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }

    setActivePage('guests')
  }

  function handleDeleteGuest(guestId) {
    setDeleteGuestId(guestId)
  }

  function confirmDeleteGuest() {
    const guestToDelete = guests.find((guest) => guest.id === deleteGuestId)
    if (guestToDelete) {
      URL.revokeObjectURL(guestToDelete.photoUrl)
      setGuests((currentGuests) =>
        currentGuests.filter((guest) => guest.id !== deleteGuestId),
      )
    }
    setDeleteGuestId(null)
  }

  function updateGuestStatus(guestId, status) {
    const timestamp = new Date().toISOString()
    setGuests((currentGuests) =>
      currentGuests.map((guest) => {
        if (guest.id !== guestId) return guest
        if (status === 'arrived') {
          return { ...guest, arrivedAt: guest.arrivedAt ?? timestamp }
        }
        if (status === 'departed' && guest.arrivedAt) {
          return { ...guest, departedAt: guest.departedAt ?? timestamp }
        }
        return guest
      }),
    )
  }

  function getGuestStatus(guest) {
    if (guest.departedAt) return 'Sudah pulang'
    if (guest.arrivedAt) return 'Sudah datang'
    return 'Belum datang'
  }

  function formatStatusTime(timestamp) {
    return new Intl.DateTimeFormat('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(timestamp))
  }

  const visibleGuests = useMemo(() => {
    const query = searchQuery.trim().toLocaleLowerCase('id-ID')
    if (!query) return guests

    return guests.filter((guest) =>
      `${guest.fullName} ${guest.organization} ${guest.visitPurpose} ${guest.visitDate}`
        .toLocaleLowerCase('id-ID')
        .includes(query),
    )
  }, [guests, searchQuery])

  const totalPeople = guests.reduce(
    (total, guest) => total + Number(guest.peopleCount),
    0,
  )

  return (
    <main className="min-h-screen bg-slate-100 text-slate-800">
      <div className="mx-auto flex min-h-screen max-w-[1600px] flex-col bg-white shadow-2xl lg:flex-row">
          <nav
            aria-label="Navigasi buku tamu"
            className="flex w-full shrink-0 flex-wrap items-center gap-2 border-b border-emerald-100 bg-[#e8f5e9] p-3 text-emerald-950 shadow-xl sm:p-4 lg:sticky lg:top-0 lg:min-h-screen lg:w-64 lg:content-start lg:items-stretch lg:gap-2 lg:border-b-0 lg:border-r lg:p-5 lg:flex-col lg:self-start"
          >
          <div className="mb-1 flex w-full items-center gap-3 border-b border-emerald-200 px-2 pb-3 pt-1 lg:mb-2 lg:pb-5">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-700 text-white">
              <Icon className="h-5 w-5">
                <path d="M3 21h18" />
                <path d="M5 21V7l8-4v18" />
                <path d="M19 21V11l-6-4" />
                <path d="M9 9v.01M9 12v.01M9 15v.01M9 18v.01" />
              </Icon>
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-extrabold tracking-wide text-emerald-950">
                BUKU TAMU
              </p>
              <p className="mt-0.5 truncate text-[11px] text-emerald-800/70">
                Sistem digital
              </p>
            </div>
          </div>

          <p className="hidden px-3 pb-1 pt-2 text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-800/60 lg:block">
            Organisasi
          </p>
          <div className="mb-3 hidden items-center gap-2 rounded-lg px-3 py-2 text-xs text-emerald-800/80 lg:flex">
            <Icon className="h-4 w-4">
              <path d="M3 21h18M5 21V7l8-4v18M19 21V11l-6-4" />
            </Icon>
            <span>Ruang penerimaan tamu</span>
          </div>

          <p className="hidden px-3 pb-1 pt-2 text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-800/60 lg:block">
            Menu utama
          </p>
          <div className="flex w-full gap-2 overflow-x-auto lg:flex-col">
          <button
            aria-current={activePage === 'home' ? 'page' : undefined}
            className={`flex w-max shrink-0 items-center justify-start gap-3 rounded-xl px-4 py-2.5 text-sm font-bold transition lg:w-full lg:px-4 lg:py-3 ${
              activePage === 'home'
                ? 'bg-[#138a5b] text-white shadow-md shadow-emerald-900/15'
                : 'text-emerald-950/75 hover:bg-emerald-100 hover:text-emerald-950'
            }`}
            onClick={() => setActivePage('home')}
            type="button"
          >
            <Icon className="h-[18px] w-[18px]">
              <path d="m3 10 9-7 9 7" />
              <path d="M5 9v11h14V9M9 20v-6h6v6" />
            </Icon>
            Beranda
          </button>
          <button
            aria-current={activePage === 'form' ? 'page' : undefined}
            className={`flex w-max shrink-0 items-center justify-start gap-3 rounded-xl px-4 py-2.5 text-sm font-bold transition lg:w-full lg:px-4 lg:py-3 ${
              activePage === 'form'
                ? 'bg-[#138a5b] text-white shadow-md shadow-emerald-900/15'
                : 'text-emerald-950/75 hover:bg-emerald-100 hover:text-emerald-950'
            }`}
            onClick={() => setActivePage('form')}
            type="button"
          >
            <Icon className="h-[18px] w-[18px]">
              <path d="M12 5v14M5 12h14" />
            </Icon>
            Input Kunjungan
          </button>
          <button
            aria-current={activePage === 'guests' ? 'page' : undefined}
            className={`flex w-max shrink-0 items-center justify-start gap-3 rounded-xl px-4 py-2.5 text-sm font-bold transition lg:w-full lg:px-4 lg:py-3 ${
              activePage === 'guests'
                ? 'bg-[#138a5b] text-white shadow-md shadow-emerald-900/15'
                : 'text-emerald-950/75 hover:bg-emerald-100 hover:text-emerald-950'
            }`}
            onClick={() => setActivePage('guests')}
            type="button"
          >
            <Icon className="h-[18px] w-[18px]">
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
            </Icon>
            Daftar Tamu
            <span
              className={`rounded-full px-2 py-0.5 text-xs ${
                activePage === 'guests'
                  ? 'bg-white/20 text-white'
                  : 'bg-emerald-200 text-emerald-900'
              }`}
            >
              {guests.length}
            </span>
          </button>
          <button
            aria-current={activePage === 'directory' ? 'page' : undefined}
            className={`flex w-max shrink-0 items-center justify-start gap-3 rounded-xl px-4 py-2.5 text-sm font-bold transition lg:w-full lg:px-4 lg:py-3 ${
              activePage === 'directory'
                ? 'bg-[#138a5b] text-white shadow-md shadow-emerald-900/15'
                : 'text-emerald-950/75 hover:bg-emerald-100 hover:text-emerald-950'
            }`}
            onClick={() => setActivePage('directory')}
            type="button"
          >
            <Icon className="h-[18px] w-[18px]">
              <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
            </Icon>
            Daftar Pengisi
            <span
              className={`rounded-full px-2 py-0.5 text-xs ${
                activePage === 'directory'
                  ? 'bg-white/20 text-white'
                  : 'bg-emerald-200 text-emerald-900'
              }`}
            >
              {guests.length}
            </span>
          </button>
          </div>
          </nav>

        <div className="min-w-0 flex-1">
        <header className="flex h-[72px] items-center justify-between border-b border-slate-200 bg-white px-5 sm:px-8">
          <div className="flex items-center gap-4">
            <span className="flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 text-slate-700 shadow-sm">
              <Icon className="h-5 w-5">
                <rect height="16" rx="1" width="18" x="3" y="4" />
                <path d="M9 4v16" />
              </Icon>
            </span>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                Buku Tamu Digital
              </p>
              <h1 className="text-sm font-bold text-slate-800">
                {activePage === 'form'
                  ? 'Input Kunjungan'
                  : activePage === 'guests'
                    ? 'Daftar Tamu'
                    : activePage === 'directory'
                      ? 'Daftar Pengisi'
                      : 'Beranda'}
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs font-medium text-slate-500 sm:text-sm">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            Sistem pencatatan kunjungan
          </div>
        </header>
        <div className="min-h-[calc(100vh-72px)] bg-slate-50/70 px-4 py-6 sm:px-7 sm:py-8 lg:px-9">
        {activePage === 'home' ? (
          <>
            <section className="mb-8 flex flex-col justify-between gap-5 rounded-3xl bg-gradient-to-br from-emerald-800 via-emerald-700 to-teal-700 p-6 text-white shadow-lg shadow-emerald-900/15 sm:p-8 lg:flex-row lg:items-center">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-100">
                  Ringkasan aktivitas
                </p>
                <h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
                  Selamat datang di Buku Tamu Digital
                </h2>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-emerald-50/90 sm:text-base">
                  Kelola pencatatan kunjungan dengan lebih mudah. Mulai dari mengisi
                  kunjungan hingga melihat daftar pengunjung.
                </p>
              </div>
              <button
                className="flex h-12 shrink-0 items-center justify-center gap-2 self-start rounded-xl bg-white px-5 text-sm font-bold text-emerald-800 shadow-sm transition hover:bg-emerald-50 lg:self-center"
                onClick={() => {
                  setEditingGuestId(null)
                  setFormData(emptyForm)
                  setPhoto(null)
                  setPhotoPreviewUrl(null)
                  setActivePage('form')
                }}
                type="button"
              >
                <Icon className="h-[18px] w-[18px]">
                  <path d="M12 5v14M5 12h14" />
                </Icon>
                Catat Kunjungan
              </button>
            </section>

            <section className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-slate-500">Total kunjungan</p>
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                    <Icon>
                      <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
                    </Icon>
                  </span>
                </div>
                <p className="mt-4 text-3xl font-bold tracking-tight text-slate-900">
                  {guests.length}
                </p>
                <p className="mt-1 text-xs text-slate-500">kunjungan tercatat</p>
              </article>

              <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-slate-500">Total pengunjung</p>
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-50 text-sky-700">
                    <Icon>
                      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                      <circle cx="9" cy="7" r="4" />
                      <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
                    </Icon>
                  </span>
                </div>
                <p className="mt-4 text-3xl font-bold tracking-tight text-slate-900">
                  {totalPeople}
                </p>
                <p className="mt-1 text-xs text-slate-500">orang berkunjung</p>
              </article>

              <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:col-span-2 xl:col-span-1">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-slate-500">Tanggal hari ini</p>
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
                    <Icon>
                      <rect height="18" rx="2" width="18" x="3" y="4" />
                      <path d="M16 2v4M8 2v4M3 10h18" />
                    </Icon>
                  </span>
                </div>
                <p className="mt-4 text-xl font-bold tracking-tight text-slate-900">
                  {new Intl.DateTimeFormat('id-ID', {
                    dateStyle: 'long',
                  }).format(new Date())}
                </p>
                <p className="mt-1 text-xs text-slate-500">Buku tamu aktif</p>
              </article>
            </section>

            <section className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(260px,0.6fr)]">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                <div className="mb-5 flex items-center justify-between gap-3">
                  <div>
                    <h3 className="font-bold text-slate-900">Kunjungan terbaru</h3>
                    <p className="mt-1 text-sm text-slate-500">
                      Ringkasan tamu yang baru dicatat
                    </p>
                  </div>
                  <button
                    className="text-sm font-semibold text-emerald-700 hover:text-emerald-900"
                    onClick={() => setActivePage('guests')}
                    type="button"
                  >
                    Lihat semua
                  </button>
                </div>
                {guests.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-5 py-10 text-center">
                    <p className="font-semibold text-slate-700">Belum ada kunjungan</p>
                    <p className="mt-1 text-sm text-slate-500">
                      Data kunjungan yang disimpan akan muncul di sini.
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {guests.slice(0, 5).map((guest) => (
                      <div
                        className="flex flex-wrap items-center justify-between gap-3 py-4 first:pt-0 last:pb-0"
                        key={guest.id}
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 font-bold text-emerald-800">
                            {guest.fullName.charAt(0).toUpperCase()}
                          </span>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-bold text-slate-800">
                              {guest.fullName}
                            </p>
                            <p className="mt-0.5 truncate text-xs text-slate-500">
                              {guest.organization}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-semibold text-slate-700">
                            {guest.peopleCount} orang
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            {new Intl.DateTimeFormat('id-ID', {
                              dateStyle: 'medium',
                            }).format(new Date(`${guest.visitDate}T00:00:00`))}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                <h3 className="font-bold text-slate-900">Akses cepat</h3>
                <p className="mt-1 text-sm text-slate-500">
                  Pilih menu untuk melanjutkan
                </p>
                <div className="mt-5 space-y-3">
                  <button
                    className="flex w-full items-center gap-3 rounded-xl border border-slate-200 p-4 text-left transition hover:border-emerald-200 hover:bg-emerald-50/60"
                    onClick={() => {
                      setEditingGuestId(null)
                      setFormData(emptyForm)
                      setPhoto(null)
                      setPhotoPreviewUrl(null)
                      setActivePage('form')
                    }}
                    type="button"
                  >
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-800">
                      <Icon>
                        <path d="M12 5v14M5 12h14" />
                      </Icon>
                    </span>
                    <span>
                      <span className="block text-sm font-bold text-slate-800">
                        Input kunjungan
                      </span>
                      <span className="mt-0.5 block text-xs text-slate-500">
                        Catat tamu baru
                      </span>
                    </span>
                  </button>
                  <button
                    className="flex w-full items-center gap-3 rounded-xl border border-slate-200 p-4 text-left transition hover:border-emerald-200 hover:bg-emerald-50/60"
                    onClick={() => setActivePage('directory')}
                    type="button"
                  >
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-100 text-sky-800">
                      <Icon>
                        <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
                      </Icon>
                    </span>
                    <span>
                      <span className="block text-sm font-bold text-slate-800">
                        Daftar pengisi
                      </span>
                      <span className="mt-0.5 block text-xs text-slate-500">
                        Lihat nama pengunjung
                      </span>
                    </span>
                  </button>
                </div>
              </div>
            </section>
          </>
        ) : activePage === 'form' ? (
          <>
            <section className="mb-8 max-w-3xl">
              <p className="mb-3 inline-flex items-center gap-2 rounded-full bg-emerald-100/70 px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] text-emerald-800">
                <Icon className="h-4 w-4">
                  <path d="M12 3v18M3 12h18" />
                </Icon>
                Formulir kunjungan
              </p>
              <h2 className="text-3xl font-semibold leading-tight tracking-tight text-slate-900 sm:text-4xl">
                Catat tamu yang datang,
                <span className="text-emerald-700"> dengan mudah.</span>
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500 sm:text-base">
                Lengkapi identitas, waktu kunjungan, jumlah rombongan, asal, dan lampiran foto.
              </p>
            </section>

            <section className="max-w-3xl rounded-3xl border border-white/80 bg-white/80 p-5 shadow-[0_20px_60px_-32px_rgba(15,23,42,0.28)] backdrop-blur-xl sm:p-8">
              <div className="mb-7 flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-700">
                    Data tamu
                  </p>
                  <h3 className="mt-1 text-xl font-bold tracking-tight text-slate-900">
                    Informasi kunjungan
                  </h3>
                </div>
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                  <Icon>
                    <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
                  </Icon>
                </span>
              </div>

              <form className="space-y-5" onSubmit={handleSubmit}>
                <Field
                  autoComplete="name"
                  icon={
                    <Icon className="h-[18px] w-[18px]">
                      <path d="M20 21a8 8 0 0 0-16 0" />
                      <circle cx="12" cy="8" r="4" />
                    </Icon>
                  }
                  label="Nama Lengkap"
                  name="fullName"
                  onChange={handleChange}
                  placeholder="Masukkan nama lengkap tamu"
                  required
                  value={formData.fullName}
                />

                <Field
                  autoComplete="organization"
                  icon={
                    <Icon className="h-[18px] w-[18px]">
                      <path d="M3 21h18M5 21V7l8-4v18M19 21V11l-6-4" />
                      <path d="M9 9v.01M9 12v.01M9 15v.01M9 18v.01" />
                    </Icon>
                  }
                  label="Asal / Instansi"
                  name="organization"
                  onChange={handleChange}
                  placeholder="Asal daerah, instansi, atau organisasi"
                  required
                  value={formData.organization}
                />

                <Field
                  icon={
                    <Icon className="h-[18px] w-[18px]">
                      <circle cx="12" cy="12" r="10" />
                      <path d="M12 8v4l3 2" />
                    </Icon>
                  }
                  label="Tujuan Kunjungan"
                  name="visitPurpose"
                  onChange={handleChange}
                  placeholder="Contoh: konsultasi, rapat, pengantaran dokumen"
                  required
                  value={formData.visitPurpose}
                />

                <div className="grid gap-5 sm:grid-cols-2">
                  <Field
                    icon={
                      <Icon className="h-[18px] w-[18px]">
                        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                        <circle cx="9" cy="7" r="4" />
                        <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
                      </Icon>
                    }
                    label="Jumlah Orang"
                    min="1"
                    name="peopleCount"
                    onChange={handleChange}
                    required
                    type="number"
                    value={formData.peopleCount}
                  />
                  <Field
                    icon={
                      <Icon className="h-[18px] w-[18px]">
                        <rect height="18" rx="2" width="18" x="3" y="4" />
                        <path d="M16 2v4M8 2v4M3 10h18" />
                      </Icon>
                    }
                    label="Tanggal Kunjungan"
                    name="visitDate"
                    onChange={handleChange}
                    required
                    type="date"
                    value={formData.visitDate}
                  />
                </div>

                <div className="grid gap-5 sm:grid-cols-2">
                  <Field
                    icon={
                      <Icon className="h-[18px] w-[18px]">
                        <circle cx="12" cy="12" r="10" />
                        <path d="M12 6v6l4 2" />
                      </Icon>
                    }
                    label="Jam Kedatangan"
                    name="arrivalTime"
                    onChange={handleChange}
                    required
                    type="time"
                    value={formData.arrivalTime}
                  />
                  <Field
                    icon={
                      <Icon className="h-[18px] w-[18px]">
                        <circle cx="12" cy="12" r="10" />
                        <path d="M12 6v6l4 2" />
                      </Icon>
                    }
                    label="Jam Kepulangan"
                    name="departureTime"
                    onChange={handleChange}
                    required
                    type="time"
                    value={formData.departureTime}
                  />
                </div>

                <div>
                  <span className="mb-2 block text-sm font-semibold text-slate-700">
                    Lampirkan Foto Kunjungan
                  </span>
                  <label className="flex min-h-[84px] cursor-pointer items-center gap-3 rounded-xl border border-dashed border-slate-300 bg-slate-50/80 px-4 py-3 transition hover:border-emerald-400 hover:bg-emerald-50/40">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-emerald-700 shadow-sm">
                      <Icon>
                        <path d="M4 7h3l2-3h6l2 3h3a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2Z" />
                        <circle cx="12" cy="13" r="3" />
                      </Icon>
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-slate-700">
                        {photo?.name ?? editingGuest?.photoName ?? 'Pilih foto kunjungan'}
                      </span>
                      <span className="mt-0.5 block text-xs text-slate-500">
                        Format gambar JPG, PNG, atau lainnya
                      </span>
                    </span>
                    <span className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600">
                      Unggah
                    </span>
                    <input
                      accept="image/*"
                      className="sr-only"
                      onChange={handlePhotoChange}
                      ref={fileInputRef}
                      type="file"
                    />
                  </label>
                  {photoError && (
                    <p className="mt-2 text-xs font-medium text-rose-600" role="alert">
                      {photoError}
                    </p>
                  )}
                  {(photoPreviewUrl || editingGuest) && (
                    <img
                      alt={`Pratinjau ${photo?.name ?? editingGuest.photoName}`}
                      className="mt-3 h-32 w-full rounded-xl border border-slate-200 object-cover sm:w-48"
                      src={photoPreviewUrl ?? editingGuest.photoUrl}
                    />
                  )}
                </div>

                <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-between">
                  <button
                    className="flex h-12 items-center justify-center rounded-xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
                    onClick={editingGuest ? handleCancelEdit : () => setActivePage('guests')}
                    type="button"
                  >
                    {editingGuest ? 'Batalkan Edit' : `Lihat Daftar Tamu (${guests.length})`}
                  </button>
                  <button
                    className="flex h-12 items-center justify-center gap-2 rounded-xl bg-emerald-700 px-6 text-sm font-bold text-white shadow-lg shadow-emerald-900/15 transition hover:bg-emerald-800 focus:outline-none focus:ring-4 focus:ring-emerald-500/20 active:translate-y-px"
                    type="submit"
                  >
                    <Icon className="h-[18px] w-[18px]">
                      <path d="M12 5v14M5 12h14" />
                    </Icon>
                    {editingGuest ? 'Simpan Perubahan' : 'Simpan Kunjungan'}
                  </button>
                </div>
              </form>
            </section>
          </>
        ) : activePage === 'directory' ? (
          <>
            <section className="mb-8 flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
              <div className="max-w-3xl">
                <p className="mb-3 inline-flex items-center gap-2 rounded-full bg-emerald-100/70 px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] text-emerald-800">
                  Buku pengunjung
                </p>
                <h2 className="text-3xl font-semibold leading-tight tracking-tight text-slate-900 sm:text-4xl">
                  Siapa saja yang sudah mengisi?
                </h2>
                <p className="mt-3 text-sm leading-6 text-slate-500 sm:text-base">
                  Halaman ini berisi daftar nama dan asal pengunjung yang telah mengisi
                  formulir kunjungan.
                </p>
              </div>
              <button
                className="flex h-12 shrink-0 items-center justify-center gap-2 rounded-xl bg-emerald-700 px-5 text-sm font-bold text-white shadow-lg shadow-emerald-900/15 transition hover:bg-emerald-800"
                onClick={() => setActivePage('form')}
                type="button"
              >
                <Icon className="h-[18px] w-[18px]">
                  <path d="M12 5v14M5 12h14" />
                </Icon>
                Isi Formulir
              </button>
            </section>

            <section className="mb-6 grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-white/80 bg-white/75 p-5 shadow-sm backdrop-blur">
                <p className="text-sm font-medium text-slate-500">Pengisi formulir</p>
                <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
                  {guests.length}
                  <span className="ml-2 text-sm font-medium text-slate-500">entri</span>
                </p>
              </div>
              <div className="rounded-2xl border border-white/80 bg-white/75 p-5 shadow-sm backdrop-blur">
                <p className="text-sm font-medium text-slate-500">Jumlah orang terdaftar</p>
                <p className="mt-2 text-3xl font-bold tracking-tight text-emerald-800">
                  {totalPeople}
                  <span className="ml-2 text-sm font-medium text-slate-500">orang</span>
                </p>
              </div>
            </section>

            <section className="rounded-3xl border border-white/80 bg-white/75 p-5 shadow-[0_20px_60px_-32px_rgba(15,23,42,0.28)] backdrop-blur-xl sm:p-7">
              <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                <div>
                  <h3 className="text-lg font-bold tracking-tight text-slate-900">
                    Daftar pengunjung terdaftar
                  </h3>
                  <p className="mt-1 text-sm text-slate-500">
                    Menampilkan {visibleGuests.length} dari {guests.length} pengisi formulir
                  </p>
                </div>
                <label className="relative block w-full sm:max-w-sm">
                  <span className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center text-slate-400">
                    <Icon className="h-[18px] w-[18px]">
                      <circle cx="11" cy="11" r="8" />
                      <path d="m21 21-4.35-4.35" />
                    </Icon>
                  </span>
                  <input
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-11 pr-4 text-sm outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
                    onChange={(event) => setSearchQuery(event.target.value)}
                    placeholder="Cari nama, asal, tujuan, atau tanggal..."
                    type="search"
                    value={searchQuery}
                  />
                </label>
              </div>

              {visibleGuests.length === 0 ? (
                <div className="flex min-h-[300px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 px-6 py-12 text-center">
                  <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white text-emerald-700 shadow-sm">
                    <Icon className="h-7 w-7">
                      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                      <circle cx="9" cy="7" r="4" />
                      <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
                    </Icon>
                  </span>
                  <h4 className="mt-5 text-base font-bold text-slate-800">
                    {guests.length === 0
                      ? 'Belum ada yang mengisi formulir'
                      : 'Pengunjung tidak ditemukan'}
                  </h4>
                  <p className="mt-2 max-w-sm text-sm leading-6 text-slate-500">
                    {guests.length === 0
                      ? 'Nama pengunjung akan tercatat di halaman ini setelah formulir kunjungan disimpan.'
                      : 'Coba gunakan kata kunci nama, asal, instansi, atau tanggal yang berbeda.'}
                  </p>
                  {guests.length === 0 && (
                    <button
                      className="mt-5 rounded-xl bg-emerald-700 px-5 py-3 text-sm font-bold text-white transition hover:bg-emerald-800"
                      onClick={() => setActivePage('form')}
                      type="button"
                    >
                      Isi Formulir Kunjungan
                    </button>
                  )}
                </div>
              ) : (
                <div className="overflow-x-auto rounded-2xl border border-slate-100">
                  <table className="w-full min-w-[800px] border-collapse text-left">
                    <thead className="bg-slate-50">
                      <tr className="text-xs font-bold uppercase tracking-wide text-slate-500">
                        <th className="px-5 py-4">Nama pengunjung</th>
                        <th className="px-5 py-4">Asal / instansi</th>
                        <th className="px-5 py-4">Tujuan kunjungan</th>
                        <th className="px-5 py-4">Tanggal kunjungan</th>
                        <th className="px-5 py-4">Jumlah orang</th>
                        <th className="px-5 py-4">Status</th>
                        <th className="px-5 py-4">Rincian</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {visibleGuests.map((guest) => (
                        <tr className="text-sm" key={guest.id}>
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 font-bold text-emerald-800">
                                {guest.fullName.charAt(0).toUpperCase()}
                              </span>
                              <span className="font-semibold text-slate-800">
                                {guest.fullName}
                              </span>
                            </div>
                          </td>
                          <td className="px-5 py-4 text-slate-600">{guest.organization}</td>
                          <td className="max-w-xs px-5 py-4 text-slate-600">
                            <span className="block truncate" title={guest.visitPurpose}>
                              {guest.visitPurpose}
                            </span>
                          </td>
                          <td className="px-5 py-4 text-slate-600">
                            {new Intl.DateTimeFormat('id-ID', {
                              dateStyle: 'medium',
                            }).format(new Date(`${guest.visitDate}T00:00:00`))}
                          </td>
                          <td className="px-5 py-4 text-slate-600">
                            {guest.peopleCount} orang
                          </td>
                          <td className="px-5 py-4">
                            <span
                              className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                                guest.departedAt
                                  ? 'bg-slate-100 text-slate-700'
                                  : guest.arrivedAt
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {getGuestStatus(guest)}
                            </span>
                          </td>
                          <td className="px-5 py-4">
                            <button
                              className="font-semibold text-emerald-700 hover:text-emerald-900"
                              onClick={() => {
                                setSearchQuery('')
                                setActivePage('guests')
                              }}
                              type="button"
                            >
                              Lihat rincian
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </>
        ) : (
          <>
            <section className="mb-8 flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
              <div className="max-w-3xl">
                <p className="mb-3 inline-flex items-center gap-2 rounded-full bg-emerald-100/70 px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] text-emerald-800">
                  Riwayat kunjungan
                </p>
                <h2 className="text-3xl font-semibold leading-tight tracking-tight text-slate-900 sm:text-4xl">
                  Daftar tamu yang datang
                </h2>
                <p className="mt-3 text-sm leading-6 text-slate-500 sm:text-base">
                  Lihat informasi tamu, waktu berkunjung, jumlah rombongan, asal, dan foto
                  kunjungan.
                </p>
              </div>
              <button
                className="flex h-12 shrink-0 items-center justify-center gap-2 rounded-xl bg-emerald-700 px-5 text-sm font-bold text-white shadow-lg shadow-emerald-900/15 transition hover:bg-emerald-800"
                onClick={() => setActivePage('form')}
                type="button"
              >
                <Icon className="h-[18px] w-[18px]">
                  <path d="M12 5v14M5 12h14" />
                </Icon>
                Tambah Kunjungan
              </button>
            </section>

            <section className="mb-6 grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-white/80 bg-white/75 p-5 shadow-sm backdrop-blur">
                <p className="text-sm font-medium text-slate-500">Total kunjungan</p>
                <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
                  {guests.length}
                  <span className="ml-2 text-sm font-medium text-slate-500">tamu / rombongan</span>
                </p>
              </div>
              <div className="rounded-2xl border border-white/80 bg-white/75 p-5 shadow-sm backdrop-blur">
                <p className="text-sm font-medium text-slate-500">Total orang berkunjung</p>
                <p className="mt-2 text-3xl font-bold tracking-tight text-emerald-800">
                  {totalPeople}
                  <span className="ml-2 text-sm font-medium text-slate-500">orang</span>
                </p>
              </div>
            </section>

            <section className="rounded-3xl border border-white/80 bg-white/75 p-5 shadow-[0_20px_60px_-32px_rgba(15,23,42,0.28)] backdrop-blur-xl sm:p-7">
              <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                <div>
                  <h3 className="text-lg font-bold tracking-tight text-slate-900">
                    Riwayat tamu
                  </h3>
                  <p className="mt-1 text-sm text-slate-500">
                    {visibleGuests.length} dari {guests.length} kunjungan
                  </p>
                </div>
                <label className="relative block w-full sm:max-w-sm">
                  <span className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center text-slate-400">
                    <Icon className="h-[18px] w-[18px]">
                      <circle cx="11" cy="11" r="8" />
                      <path d="m21 21-4.35-4.35" />
                    </Icon>
                  </span>
                  <input
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-11 pr-4 text-sm outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
                    onChange={(event) => setSearchQuery(event.target.value)}
                    placeholder="Cari nama, asal, tujuan, atau tanggal..."
                    type="search"
                    value={searchQuery}
                  />
                </label>
              </div>

              {visibleGuests.length === 0 ? (
                <div className="flex min-h-[300px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 px-6 py-12 text-center">
                  <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white text-emerald-700 shadow-sm">
                    <Icon className="h-7 w-7">
                      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                      <circle cx="9" cy="7" r="4" />
                      <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
                    </Icon>
                  </span>
                  <h4 className="mt-5 text-base font-bold text-slate-800">
                    {guests.length === 0 ? 'Belum ada tamu tercatat' : 'Tamu tidak ditemukan'}
                  </h4>
                  <p className="mt-2 max-w-sm text-sm leading-6 text-slate-500">
                    {guests.length === 0
                      ? 'Mulai catat kunjungan pertama dengan mengisi formulir tamu.'
                      : 'Coba gunakan kata kunci nama, asal, instansi, atau tanggal yang berbeda.'}
                  </p>
                  {guests.length === 0 && (
                    <button
                      className="mt-5 rounded-xl bg-emerald-700 px-5 py-3 text-sm font-bold text-white transition hover:bg-emerald-800"
                      onClick={() => setActivePage('form')}
                      type="button"
                    >
                      Isi Formulir Kunjungan
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {visibleGuests.map((guest) => (
                    <article
                      className="grid gap-4 rounded-2xl border border-slate-100 bg-white/90 p-4 shadow-sm transition hover:border-emerald-100 hover:shadow-md sm:p-5 lg:grid-cols-[minmax(0,1fr)_180px]"
                      key={guest.id}
                    >
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="flex min-w-0 items-center gap-3">
                            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 font-bold text-emerald-800">
                              {guest.fullName.charAt(0).toUpperCase()}
                            </span>
                            <div className="min-w-0">
                              <h4 className="truncate font-bold text-slate-900">
                                {guest.fullName}
                              </h4>
                              <p className="mt-0.5 truncate text-sm text-slate-500">
                                {guest.organization}
                              </p>
                            </div>
                          </div>
                          <div className="flex flex-col items-start gap-2 sm:items-end">
                            <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800">
                              {new Intl.DateTimeFormat('id-ID', {
                                dateStyle: 'medium',
                              }).format(new Date(`${guest.visitDate}T00:00:00`))}
                            </span>
                            <span
                              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                                guest.departedAt
                                  ? 'bg-slate-100 text-slate-700'
                                  : guest.arrivedAt
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {getGuestStatus(guest)}
                            </span>
                          </div>
                        </div>

                        <div className="mt-4 grid grid-cols-2 gap-4 border-t border-slate-100 pt-4 sm:grid-cols-4">
                          <div className="col-span-2 sm:col-span-4">
                            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                              Tujuan kunjungan
                            </p>
                            <p className="mt-1 text-sm font-semibold text-slate-700">
                              {guest.visitPurpose}
                            </p>
                          </div>
                          <div>
                            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                              Jumlah orang
                            </p>
                            <p className="mt-1 text-sm font-semibold text-slate-700">
                              {guest.peopleCount} orang
                            </p>
                          </div>
                          <div>
                            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                              Jam datang
                            </p>
                            <p className="mt-1 text-sm font-semibold text-slate-700">
                              {guest.arrivalTime}
                            </p>
                          </div>
                          <div>
                            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                              Jam pulang
                            </p>
                            <p className="mt-1 text-sm font-semibold text-slate-700">
                              {guest.departureTime}
                            </p>
                          </div>
                          <div>
                            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                              Waktu datang aktual
                            </p>
                            <p className="mt-1 text-sm font-semibold text-slate-700">
                              {guest.arrivedAt ? formatStatusTime(guest.arrivedAt) : 'Belum datang'}
                            </p>
                          </div>
                          <div>
                            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                              Waktu pulang aktual
                            </p>
                            <p className="mt-1 text-sm font-semibold text-slate-700">
                              {guest.departedAt ? formatStatusTime(guest.departedAt) : 'Belum pulang'}
                            </p>
                          </div>
                          <div className="min-w-0">
                            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                              Lampiran foto
                            </p>
                            <p className="mt-1 truncate text-sm font-semibold text-emerald-800" title={guest.photoName}>
                              {guest.photoName}
                            </p>
                          </div>
                        </div>
                        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4">
                          {!guest.arrivedAt && (
                            <button
                              className="rounded-lg bg-emerald-700 px-3 py-2 text-xs font-bold text-white transition hover:bg-emerald-800"
                              onClick={() => updateGuestStatus(guest.id, 'arrived')}
                              type="button"
                            >
                              Tandai sudah datang
                            </button>
                          )}
                          {guest.arrivedAt && !guest.departedAt && (
                            <button
                              className="rounded-lg bg-slate-800 px-3 py-2 text-xs font-bold text-white transition hover:bg-slate-900"
                              onClick={() => updateGuestStatus(guest.id, 'departed')}
                              type="button"
                            >
                              Tandai sudah pulang
                            </button>
                          )}
                          {guest.arrivedAt && (
                            <span className="text-xs text-slate-500">
                              Datang pukul {formatStatusTime(guest.arrivedAt)}
                            </span>
                          )}
                          {guest.departedAt && (
                            <span className="text-xs text-slate-500">
                              Pulang pukul {formatStatusTime(guest.departedAt)}
                            </span>
                          )}
                        </div>
                        <div className="mt-4 flex flex-wrap gap-4">
                          <button
                            className="text-xs font-semibold text-emerald-700 transition hover:text-emerald-900"
                            onClick={() => handleEditGuest(guest)}
                            type="button"
                          >
                            Edit data
                          </button>
                          <button
                            className="text-xs font-semibold text-rose-600 transition hover:text-rose-800"
                            onClick={() => handleDeleteGuest(guest.id)}
                            type="button"
                          >
                            Hapus catatan
                          </button>
                        </div>
                      </div>

                      <a
                        className="group relative block h-44 overflow-hidden rounded-xl bg-slate-100 lg:h-full lg:min-h-[150px]"
                        href={guest.photoUrl}
                        rel="noreferrer"
                        target="_blank"
                        title={`Buka foto ${guest.photoName} di tab baru`}
                      >
                        <img
                          alt={`Foto kunjungan ${guest.fullName}`}
                          className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                          src={guest.photoUrl}
                        />
                        <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent px-3 pb-3 pt-8 text-xs font-semibold text-white">
                          Lihat foto
                        </span>
                      </a>
                    </article>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
        </div>

        <footer className="mt-8 pb-2 text-center text-xs text-slate-400">
          Buku Tamu Digital <span className="mx-1.5">·</span> Pencatatan kunjungan lebih praktis
        </footer>
      </div>
      </div>
      {deleteGuestId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm"
          onClick={(event) => {
            if (event.target === event.currentTarget) setDeleteGuestId(null)
          }}
        >
          <section
            aria-labelledby="delete-dialog-title"
            aria-modal="true"
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
            role="alertdialog"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-rose-100 text-rose-700">
              <Icon>
                <path d="M12 9v4M12 17h.01" />
                <path d="M10.3 3.9 1.8 18.6A2 2 0 0 0 3.5 21h17a2 2 0 0 0 1.7-2.4L13.7 3.9a2 2 0 0 0-3.4 0Z" />
              </Icon>
            </div>
            <h2 id="delete-dialog-title" className="mt-4 text-lg font-bold text-slate-900">
              Hapus catatan kunjungan?
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Catatan milik{' '}
              <span className="font-semibold text-slate-800">
                {guests.find((guest) => guest.id === deleteGuestId)?.fullName}
              </span>{' '}
              akan dihapus dan tidak dapat dipulihkan.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                autoFocus
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                onClick={() => setDeleteGuestId(null)}
                type="button"
              >
                Batal
              </button>
              <button
                className="rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-rose-700"
                onClick={confirmDeleteGuest}
                type="button"
              >
                Ya, hapus
              </button>
            </div>
          </section>
        </div>
      )}
    </main>
  )
}

export default App
