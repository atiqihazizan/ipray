Fail dalam folder ini ialah SNIPPET untuk fail sistem yang SUDAH WUJUD di Raspberry Pi.
Jangan gantikan seluruh fail; gunakan kandungan sebagai rujukan untuk TAMBAH atau UBAH bahagian tertentu.

Peta snippet -> fail sebenar di Pi:
  boot-firmware-config.txt.snippet  -> /boot/firmware/config.txt  (tambah dalam [all])
  boot-firmware-cmdline.txt.snippet -> /boot/firmware/cmdline.txt (tambah quiet loglevel=0 splash pada baris)
  etc-lightdm-lightdm.conf.snippet -> /etc/lightdm/lightdm.conf  (bahagian [Seat:*])
  etc-plymouth-plymouthd.conf.snippet -> /etc/plymouth/plymouthd.conf (Theme=ipray-welcome)

Backup fail asal sebelum edit: cp /path/to/file /path/to/file.bak
