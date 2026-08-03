PROJECT_DIR := $(CURDIR)
PO_DIR := $(PROJECT_DIR)/po
POT_FILE  := $(PO_DIR)/binary-clock.pot

.PHONY: extract-pot test clean build local

extract-pot:
	mkdir -p $(PO_DIR)
	flatpak run \
	--command=xgettext \
	--filesystem=host \
	--cwd="$(PROJECT_DIR)" \
	org.gnome.Sdk/x86_64/50 \
	--from-code=UTF-8 \
	--output="$(POT_FILE)" \
	*.js

test: build

clean:
	rm -f *.zip

build: clean
	gnome-extensions pack ./ --extra-source=bcd.js

local: build
	gnome-extensions install -f *.zip

debug: local
	dbus-run-session gnome-shell --nested --wayland