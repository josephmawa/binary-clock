const { Adw, Gtk, Gio } = imports.gi;
const ExtUtils = imports.misc.extensionUtils;

function init(metaData) {}

function buildPrefsWidget() {
  const settings = ExtUtils.getSettings();
  const prefsPage = new Adw.PreferencesPage({
    name: "general",
    title: "General",
  });

  const prefsGroup = new Adw.PreferencesGroup({
    title: "Preferences",
  });
  prefsPage.add(prefsGroup);

  const timeFormatRow = new Adw.ActionRow({
    title: "Use 24-hour format",
  });
  prefsGroup.add(timeFormatRow);

  const timeFormatSwitch = new Gtk.Switch({
    valign: Gtk.Align.CENTER,
  });

  settings.bind(
    "twenty-four-hour-format",
    timeFormatSwitch,
    "active",
    Gio.SettingsBindFlags.BIND_DEFAULT,
  );

  timeFormatRow.add_suffix(timeFormatSwitch);
  timeFormatRow.set_activatable_widget(timeFormatSwitch);

  return prefsPage;
}
