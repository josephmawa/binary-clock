import Gtk from "gi://Gtk";
import Gio from "gi://Gio";

import {
  ExtensionPreferences,
  gettext as _,
} from "resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js";

export default class BinaryClockPreferences extends ExtensionPreferences {
  constructor(metadata) {
    super(metadata);
  }

  fillPreferencesWindow(window) {
    const builder = new Gtk.Builder();
    builder.set_translation_domain(this.metadata["gettext-domain"]);

    const prefsFile = this.dir.get_child("prefs.ui").get_path();
    builder.add_from_file(prefsFile);

    const page = builder.get_object("prefs_page");
    window.add(page);

    const settings = this.getSettings();
    const clockType = settings.get_string("clock-type");
    const binCheckBtn = builder.get_object("bin_check_btn");
    const bcdCheckBtn = builder.get_object("bcd_check_btn");

    binCheckBtn.active = clockType === "bin";
    bcdCheckBtn.active = clockType === "bcd";

    binCheckBtn.connect("notify::active", () => {
      if (binCheckBtn.active) {
        settings.set_string("clock-type", "bin");
      } else {
        settings.set_string("clock-type", "bcd");
      }
    });

    const bcdDisplayNumericClock = builder.get_object(
      "bcd_display_numeric_clock",
    );
    settings.bind(
      "display-numeric-clock-bcd",
      bcdDisplayNumericClock,
      "active",
      Gio.SettingsBindFlags.DEFAULT,
    );

    const numericClockFormatBcd = settings.get_string(
      "numeric-clock-format-bcd",
    );
    const twelveHrClockCheckBtn = builder.get_object("twelve_hr_clock_btn");
    const twentyFourHrClockCheckBtn = builder.get_object(
      "twenty_four_hr_clock_btn",
    );

    twelveHrClockCheckBtn.active = numericClockFormatBcd === "twelve-hr-format";
    twentyFourHrClockCheckBtn.active =
      numericClockFormatBcd === "twenty-four-hr-format";

    twelveHrClockCheckBtn.connect("notify::active", () => {
      if (twelveHrClockCheckBtn.active) {
        settings.set_string("numeric-clock-format-bcd", "twelve-hr-format");
      } else {
        settings.set_string(
          "numeric-clock-format-bcd",
          "twenty-four-hr-format",
        );
      }
    });

    const binDisplayNumericClock = builder.get_object(
      "bin_display_numeric_clock",
    );
    settings.bind(
      "display-numeric-clock-bin",
      binDisplayNumericClock,
      "active",
      Gio.SettingsBindFlags.DEFAULT,
    );

    const numericClockFormatBin = settings.get_string(
      "numeric-clock-format-bin",
    );
    const binNumericClockBtn = builder.get_object("bin_numeric_clock_btn");
    const decNumericClockBtn = builder.get_object("dec_numeric_clock_btn");

    binNumericClockBtn.active = numericClockFormatBin === "bin";
    decNumericClockBtn.active = numericClockFormatBin === "dec";

    binNumericClockBtn.connect("notify::active", () => {
      if (binNumericClockBtn.active) {
        settings.set_string("numeric-clock-format-bin", "bin");
      } else {
        settings.set_string("numeric-clock-format-bin", "dec");
      }
    });
  }
}
