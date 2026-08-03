const { Adw, Gtk, Gio } = imports.gi;
const ExtUtils = imports.misc.extensionUtils;
const { gettext: _, ngettext, pgettext } = ExtUtils;

function init(metaData) {}

function buildPrefsWidget() {
  const settings = ExtUtils.getSettings();
  const prefsPage = new Adw.PreferencesPage({
    name: "general",
    title: _("General"),
  });

  const prefsGroup = new Adw.PreferencesGroup({
    title: _("Preferences"),
  });
  prefsPage.add(prefsGroup);

  const timeFormatSwitch = new Gtk.Switch({
    valign: Gtk.Align.CENTER,
  });

  const timeFormatRow = new Adw.ActionRow({
    title: _("Use 24-hour format"),
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
    title: _("Show decimal clock"),
    activatable_widget: displayClockSwitch,
  });
  displayTimeRow.add_suffix(displayClockSwitch);
  prefsGroup.add(displayTimeRow);

  return prefsPage;
}
