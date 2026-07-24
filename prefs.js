const { Adw, Gtk } = imports.gi;

function init(metaData) {
  console.log("Inside prefs.js");
}

function buildPrefsWidget() {
  return new Gtk.Label({
    label: "Hello world!",
  });
}
