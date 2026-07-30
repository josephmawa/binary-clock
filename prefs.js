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

  const timeFormatSwitch = new Gtk.Switch({
    valign: Gtk.Align.CENTER,
  });

  const timeFormatRow = new Adw.ActionRow({
    title: "Use 24-hour format",
    activatable_widget: timeFormatSwitch,
  });

  settings.bind(
    "twenty-four-hour-format",
    timeFormatSwitch,
    "active",
    Gio.SettingsBindFlags.BIND_DEFAULT,
  );

  timeFormatRow.add_suffix(timeFormatSwitch);
  prefsGroup.add(timeFormatRow);

  const displayClockSwitch = new Gtk.Switch({
    valign: Gtk.Align.CENTER,
  });

  settings.bind(
    "display-clock",
    displayClockSwitch,
    "active",
    Gio.SettingsBindFlags.BIND_DEFAULT,
  );

  const displayTimeRow = new Adw.ActionRow({
    title: "Display time",
    activatable_widget: displayClockSwitch,
  });
  displayTimeRow.add_suffix(displayClockSwitch);
  prefsGroup.add(displayTimeRow);

  return prefsPage;
}
