.PHONY: create-pot create-po test clean build local

create-pot:
	mkdir -p $(CURDIR)/po
	xgettext --from-code=UTF-8 --output=po/binary-clock.pot *.js

create-po:
ifndef LOCALE
	$(error LOCALE is not set. Run "make create-po LOCALE=ll_CC[.ENCODING]")
endif
	msginit --input=po/binary-clock.pot --output-file=po/$(LOCALE).po --locale=$(LOCALE)

test: build

clean:
	rm -f *.zip

build: clean
	gnome-extensions pack ./ --extra-source=bcd.js

local: build
	gnome-extensions install -f *.zip

debug: local
	dbus-run-session gnome-shell --nested --wayland