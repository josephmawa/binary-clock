.PHONY: create-pot-file create-po-file update-po-file test clean build local

create-pot-file:
	mkdir -p $(CURDIR)/po
	xgettext --from-code=UTF-8 --output=po/binary-clock.pot *.js

create-po-file:
ifndef LOCALE
	$(error LOCALE is not set. Run "make create-po-file LOCALE=ll_CC[.ENCODING]")
endif
	msginit --input=po/binary-clock.pot --output-file=po/$(LOCALE).po --locale=$(LOCALE)

update-po-file:
ifndef LOCALE
	$(error LOCALE is not set. Run "make update-po-file LOCALE=locale". Pass locale as it appears in po/ file)
endif
	msgmerge --backup=off --update po/$(LOCALE).po po/binary-clock.pot

test: build

clean:
	rm -f *.zip

build: clean
	gnome-extensions pack ./ --extra-source=bcd.js --extra-source=prefs.ui

local: build
	gnome-extensions install -f *.zip

debug: local
	dbus-run-session gnome-shell --nested --wayland