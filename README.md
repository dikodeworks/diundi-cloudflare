# DiUndi.

Reel putar untuk mengundi hadiah, memilih makanan, dan menentukan tempat nongkrong. Dibuat oleh DikodeWorks — tanpa build, tanpa dependensi, dan bisa dipasang sebagai aplikasi (PWA) di Windows, macOS, iOS, dan Android.

Tagline-nya sederhana: biar nggak bingung lagi kalau ditanya "terserah".

## Menjalankan

Buka `index.html` langsung di browser, atau jalankan server lokal:

```bash
python3 -m http.server 8765
```

Lalu buka http://127.0.0.1:8765.

> PWA (install + offline) butuh `localhost` atau HTTPS. Kalau dibuka lewat `file://`, aplikasi tetap jalan tapi tanpa service worker.

## Tiga mode

| Mode | Cara kerja |
| --- | --- |
| **Undian** | Reel menggulir nama peserta dari atas ke bawah. Hadiah yang diputar dipilih dulu lewat dropdown **Hadiah diputar**. Pemenang keluar dari daftar peserta, hadiahnya keluar dari daftar hadiah, lalu dicatat di tab Pemenang. |
| **Makanan** | Reel menggulir pilihan makanan. Tidak ada yang dihapus, jadi bisa diputar ulang kapan saja. |
| **Tempat** | Sama seperti mode makanan, tapi untuk tempat pergi. |

## Tab undian

- **Peserta** — daftar nama yang ikut diundi. Tambah, ubah, atau hapus langsung dari baris.
- **Hadiah** — daftar hadiah. Pilih hadiah yang diputar lewat "Hadiah diputar" di kotak spin; urutan daftar tidak mengikat.
- **Pemenang** — riwayat hasil undian beserta hadiah dan waktunya, lengkap dengan tombol hapus riwayat.

## Layout

- **Desktop / notebook** — kotak spin di kiri, kotak parameter (peserta/hadiah/pemenang) di kanan. Keduanya persegi, sama tinggi, dengan kotak spin lebih lebar. Tinggi halaman diatur agar muat dalam satu layar tanpa perlu scroll.
- **Tablet & mobile** — semua tersusun dari atas ke bawah: mode & preset, reel, pilihan hadiah, hasil, lalu panel daftar.

Preset cepat (Warung, Cepat saji, Sehat, Nongkrong / Hemat, Nongkrong, Jalan-jalan) ada di dalam kotak spin, tepat di bawah pemilih mode.

## Detail

- Reel digambar dengan DOM: lima baris terlihat, baris tengah ditandai pita abu-abu dan titik merah.
- Saat berputar, nama hadiah yang diperebutkan tampil di area hasil ("Hadiah diputar"), dan reel berhenti tepat di baris tengah.
- Pemenang dipilih acak memakai `crypto.getRandomValues` bila tersedia.
- Animasi putaran ±2,7–3,4 detik dengan easing, tick saat baris melewati tengah, dan chime saat pemenang muncul.
- Data disimpan otomatis di `localStorage` dengan kunci `diputer:v1` (peserta, hadiah, pemenang, makanan, tempat, mode, tab, hadiah terpilih, hasil terakhir, dan pengaturan suara).
- Tombol suara ada di kanan atas; statusnya ikut tersimpan.
- Maksimal 24 item per daftar dan 60 riwayat pemenang.
- Menghormati `prefers-reduced-motion`.

## Shortcut

- `Spasi` — putar reel (kecuali sedang mengetik, memilih dropdown, atau modal pemenang terbuka)

## PWA

- `manifest.webmanifest` — nama, ikon 192/512, ikon maskable, shortcut mode lewat `?mode=undian|makanan|tempat`.
- `sw.js` — service worker network-first dengan cache offline untuk app shell dan aset lokal.
- Ikon PNG monokrom (reel + titik merah) dibuat lewat `node scripts/generate-icons.mjs`.

Cara memasang:

- **Windows / macOS (Chrome, Edge)** — klik ikon pasang di address bar, atau tombol **Pasang** di header aplikasi.
- **Android (Chrome)** — menu ⋮ → **Instal aplikasi** / **Tambahkan ke layar utama**.
- **iOS / iPadOS (Safari)** — tombol Bagikan → **Tambah ke Layar Utama**. Tombol **Pasang** di header juga menampilkan petunjuk ini.
- **macOS (Safari)** — menu File → **Add to Dock**.

## Struktur

| File | Isi |
| --- | --- |
| `index.html` | Markup halaman: header, kotak spin (mode, preset, reel, hadiah, hasil), panel tab, modal pemenang |
| `styles.css` | Tema minimalis monokrom, layout desktop dua kolom, dan aturan responsif |
| `app.js` | State, penyimpanan, reel, putaran, suara, rendering, dan pendaftaran PWA |
| `manifest.webmanifest` | Metadata instalasi PWA |
| `sw.js` | Cache offline app shell |
| `icons/` | Ikon aplikasi (192, 512, maskable, apple-touch) |
| `scripts/generate-icons.mjs` | Generator ikon PNG tanpa dependensi |
