# Vectoria Pro · Vektora Studio

Konverter JPG, PNG, WebP, BMP, GIF, dan AVIF dengan pemrosesan lokal. GIF diproses sebagai satu gambar. Format yang dapat dibuka mengikuti decoder browser. Batas masukan 20 MB per file dan 60 MP. Vektor, Perbesar, dan Pola menerima sampai 200 gambar per antrean. Gambar diproses berurutan. Hasil Vektor diunduh sebagai ZIP SVG, sedangkan Perbesar dan Pola mendukung ZIP PNG atau JPG.

## Studio

- **Vektor** menangkap kontur sebagai path. Pilih mode warna atau monokrom, atur detail, warna, ambang, pembersihan bintik dan latar putih, lalu bandingkan hasil. Zoom berpusat pada pratinjau. Hasil dapat diekspor sebagai SVG, EPS, PDF, PNG, atau JPG.
- **Lembar ikon** mendeteksi ikon terpisah pada latar polos atau transparan, dengan opsi kisi manual hingga 20 × 20. Hasil diunduh sebagai ZIP berisi SVG individual atau PNG. Unggah file SVG atau EPS satu per satu ke Adobe Stock.
- **Perbesar** memakai interpolasi dan pemulihan tepi opsional. Resolusi keluaran dibatasi 16 MP untuk mengendalikan memori.
- **Pola** membantu membuat ubin dengan pengulangan biasa atau cermin empat arah.
- **Gradien** membuat gradien bertekstur opsional dengan empat palet, rasio, dan arah yang dapat diedit. Ekspor loop empat detik tersedia jika browser mendukung MediaRecorder dan Canvas CaptureStream.
- **Editor gambar** di `editor.html` tetap menggunakan penyimpanan proyek browser dari versi sebelumnya.

## Hasil HD

**Kurva halus** memasang kurva Bézier pada batas yang dipakai bersama oleh dua warna, dengan mempertahankan sudut penting. Matikan jika gambar memang membutuhkan tepi piksel. **Trace HD** menambah kerapatan sampel sebelum pelacakan. SVG, EPS, dan PDF menyimpan bentuk vektor. Untuk PNG/JPG, pilih **Full HD, QHD, atau 4K** di pengaturan ekspor. Nilai tersebut berlaku pada sisi terpanjang dan gambar tetap proporsional. PNG/JPG dirender langsung dari hasil vektor. Resolusi yang lebih besar membantu menghaluskan bentuk yang dikenali, sementara detail yang sudah hilang pada sumber tidak bisa dipulihkan.

## Cara kerja

1. `converter.mjs` mendekode gambar, mengambil piksel dan mengatur antrean serta perbandingan.
2. `trace-worker.mjs` menjalankan kuantisasi warna, pembersihan bintik, pelacakan kontur dan simplifikasi titik melalui `trace.mjs`. Trace HD mengambil sampel hingga 2× lebih rapat sebelum tracing memakai interpolasi bawaan browser (bukan Lanczos), dengan batas sisi terpanjang 2.400 px dan luas 4,5 MP. Foto, gradien halus, dan tekstur berubah menjadi bidang warna. Transparansi diproses sebagai masker biner. Fokus hasil adalah ikon, logo, dan ilustrasi.
3. `formats.mjs` menulis path SVG, PostScript EPS, PDF dan ZIP lokal. Preset Adobe Stock menyesuaikan ukuran artboard sekitar 16 MP dengan mempertahankan proporsi. Ukuran artboard berbeda dari resolusi yang digunakan untuk tracing.
4. `utilities.mjs` berisi pengolahan raster dan perekaman gradien. `sw.js` menyimpan aset aplikasi untuk akses offline setelah pemasangan berhasil di browser. Gambar sumber, antrean, dan hasil konversi tersedia selama halaman aktif. Antrean menyimpan hasil sebagai Blob dan merender pratinjau hanya untuk gambar yang dipilih.

## Deploy ke Cloudflare Pages

1. Di dashboard Cloudflare, buka **Workers & Pages → Create application → Pages → Import an existing Git repository**.
2. Hubungkan GitHub, pilih `catatansantri155-pixel/vectoria-pro`, lalu pilih **Begin setup**.
3. Isi pengaturan build berikut, lalu pilih **Save and Deploy**.

| Pengaturan | Nilai |
|---|---|
| Production branch | `main` |
| Framework preset | `None` |
| Build command | `exit 0` |
| Build output directory | `dist` |
| Root directory | Kosongkan agar memakai root repo |
| Environment variables | Kosongkan |

Aplikasi statis ini berjalan tanpa npm install, database, atau kunci API. Cloudflare memberikan alamat `pages.dev` setelah deployment berhasil. Pembaruan ke `main` akan memicu deployment produksi saat integrasi Git aktif.

Cloudflare melayani editor di `/editor` setelah mengalihkan dari `/editor.html`. Service worker mengenali kedua alamat agar editor tetap bisa dibuka saat offline setelah cache berhasil dipasang. File `dist/_headers` mengatur pemeriksaan ulang service worker saat ada versi baru.

Deployment Pages standar melayani aplikasi secara publik. Publikasikan fitur ini di domain dengan akses terbatas jika studio perlu tetap privat. Gambar yang dipilih tetap diproses di browser pengguna.

[Rujukan Cloudflare Pages untuk situs statis](https://developers.cloudflare.com/pages/framework-guides/deploy-anything/)

## Jalankan secara lokal

Dari root repo, jalankan:

```sh
python -m http.server 8000 --directory dist
```

Buka [localhost:8000](http://localhost:8000/). Konverter mulai tanpa gambar. Untuk uji cepat, klik **Coba contoh**, periksa pratinjau, unduh SVG, dan buka **Editor gambar**. Adobe menilai aset secara independen dari preset ukuran aplikasi.


### Ilustrasi 3D dan file gambar
- **Ilustrasi 3D dan gradasi** menggunakan bidang gradien SVG pada gambar tanpa transparansi untuk menjaga highlight dan bayangan. Mode **Otomatis** mendeteksi gradasi pada sumber. **Jalur mesh gradien** menggunakan interpolasi Lanczos dengan sampel hingga 2×, dibatasi 1.536 piksel per sisi dan sekitar 1,8 juta sampel. Angka ini khusus jalur mesh; Trace HD pada jalur kontur memakai interpolasi browser dengan batas 2.400 px dan 4,5 MP. Penajaman lokal bekerja pada kecerahan agar tidak memucatkan warna. Pilih **SVG** untuk menyimpan gradien sebagai elemen vektor, **SVG ZIP** untuk mengunduh SVG secara terkompresi, atau **PNG/JPG** untuk hasil raster. Arsip ZIP menggunakan kompresi tanpa kehilangan kualitas jika didukung browser. Ekspor EPS/PDF menghasilkan bidang warna datar. Gambar transparan atau pilihan hapus latar menggunakan pelacakan kontur.
- Vektora membaca tanda format di dalam file dan mencoba jalur pemuatan biasa jika dekode langsung gagal. Format yang tidak didukung tetap bergantung pada dekoder browser. Ekspor ulang file yang gagal sebagai PNG atau JPG.
- **Perbesar** mendukung keluaran hingga 4K. **Pulihkan ketajaman tepi** menggunakan Lanczos, menghaluskan takik di sepanjang tepi, dan memperjelas kontras melintasi tepi. Bandingkan **Gambar asli** dan **Hasil** melalui **Detail tengah**. Unduhan memakai resolusi penuh. Detail yang sudah hilang dari sumber tetap terbatas.


### Instal sebagai aplikasi

Buka Vektora melalui HTTPS (atau localhost), lalu pilih **Pasang**. Jika prompt sistem tidak muncul, menu browser dapat menyediakan opsi instalasi. Pada iPhone dan iPad, buka di Safari dan gunakan **Bagikan → Tambahkan ke Layar Utama**. Studio dan editor tersedia offline setelah halaman dan aset selesai disimpan saat kunjungan online pertama.

### Presisi piksel dan monokrom

- **Presisi piksel** menyimpan warna dan transparansi piksel yang terbaca di browser sebagai bidang vektor pada resolusi sumber. Kontur mengikuti kisi sumber, sehingga kotak yang sudah ada tetap terlihat saat diperbesar. **Otomatis** membentuk kurva halus dan dapat menyesuaikan warna serta kontur. Presisi piksel dibatasi 4,5 MP, 8.192 px per sisi, 1,2 juta bidang, dan 260.000 kombinasi warna dan transparansi. Gunakan SVG atau PNG untuk transparansi parsial.
- **Monokrom** menyediakan **Gradasi abu-abu · 3D** untuk gambar tanpa transparansi dan **Siluet hitam-putih** untuk hasil satu warna. Tampilan otomatis mempertahankan gradasi saat sumber memiliki bayangan bertahap. Pada mode siluet, pilih bagian gelap atau terang sebagai bentuk dan sesuaikan ambang serta latar. Ambang otomatis memanfaatkan informasi warna untuk mempertahankan bentuk ilustrasi berwarna dengan latar terang netral dan membedakan detail putih pada wajah.
- **Otomatis** dan **Logo dan ikon datar** menelusuri tepi ikon hitam pada posisi di antara piksel sumber. Penghalusan menyambungkan lengkungan dengan kurva Bézier pendek dan membatasi pergeseran sambungan hingga 0,18 piksel pada resolusi pelacakan. Sudut tajam dan ruas lurus tetap ditelusuri sebagai garis. Warna dasar kertas dan kisi yang lebih terang dibuat sebagai bidang terpisah. Jika penghapusan latar dipilih, bidang kertas di dalam ikon ikut dihapus.
- Pada **Otomatis**, **Logo dan ikon datar** (lembar hitam di atas kertas), dan **Monokrom** dengan ambang otomatis, pelacak mempertahankan goresan tipis yang masih terlihat dari kontras lokal. Mode ini menelusuri bentuk huruf dari gambar sumber. Untuk ambang manual, bentuk mengikuti nilai ambang pilihanmu.

### Pemisah lembar ikon
Pilih gambar sumber lalu buka **Pisahkan lembar ikon → Otomatis → Pindai ikon**. Gunakan latar polos atau transparan dan sisakan jarak. Periksa jumlah hasil sebelum mengunduh ZIP. Kisi manual mendukung sampai 20 × 20 sel. Ikon diekspor satu per satu sebagai SVG, atau sebagai PNG dengan sisi terpanjang 1.024 px. Pilih latar **Transparan**, **Putih**, atau **Ikuti gambar sumber** sebelum mengunduh. Opsi Transparan dan Putih menghapus latar polos yang terdeteksi dan terhubung ke tepi. Pada gambar umum, Presisi piksel menghapus latar yang warnanya sama persis dengan warna tepi yang terdeteksi. Pada lembar tinta hitam di atas kertas terang, area kertas dipisahkan dari ikon dengan ambang luminans. Pratinjau vektor menggunakan SVG langsung dengan pilihan zoom 300% dan geser saat diperbesar.
