const { GObject, St, Clutter } = imports.gi;

const BitWidget = GObject.registerClass(
  {
    GTypeName: "BitWidget",
    Properties: {
      bit: GObject.ParamSpec.string(
        "bit",
        "Bit",
        "Current bit",
        GObject.ParamFlags.READWRITE,
        "0",
      ),
      index: GObject.ParamSpec.int(
        "index",
        "Index",
        "BitWidget index",
        GObject.ParamFlags.READWRITE,
        0,
        3,
        0,
      ),
    },
  },
  class BitWidget extends St.Widget {
    _init(params = {}) {
      super._init({
        x_expand: false,
        y_expand: false,
        can_focus: false,
      });

      if (params.bit == undefined) {
        params.bit = "0";
      }

      if (params.index == undefined) {
        params.index = 0;
      }

      this.bit = params.bit;
      this.index = params.index;

      this.add_style_class_name("bit");

      this.connect("notify::bit", () => {
        const styleClassName = this.get_style_class_name();
        if (this.bit === "1" && !styleClassName.includes("bit-blue-bg")) {
          this.add_style_class_name("bit-blue-bg");
        }

        if (this.bit === "0" && styleClassName.includes("bit-blue-bg")) {
          this.remove_style_class_name("bit-blue-bg");
        }
      });
    }
  },
);

const Column = GObject.registerClass(
  {
    GTypeName: "Column",
    Properties: {
      bits: GObject.ParamSpec.string(
        "bits",
        "Bits",
        "Current column bits",
        GObject.ParamFlags.READWRITE,
        "00",
      ),
    },
  },
  class Column extends St.BoxLayout {
    _init(params = {}) {
      super._init({
        vertical: true,
        style: "spacing: 5px;",
        y_align: Clutter.ActorAlign.END,
      });

      if (!params.len) {
        params.len = 2;
      }

      if (!params.num) {
        params.num = 0;
      }

      this.len = params.len;
      this.num = params.num;

      this.bits = this.num.toString(2).padStart(this.len, "0");

      for (let i = 0; i < this.bits.length; i++) {
        const bitWidget = new BitWidget({
          index: i,
          bit: this.bits[i],
        });

        this.bind_property_full(
          "bits",
          bitWidget,
          "bit",
          GObject.BindingFlags.DEFAULT | GObject.BindingFlags.SYNC_CREATE,
          (_, val) => {
            return [true, val[i]];
          },
          null,
        );

        this.add_child(bitWidget);
      }
    }

    setBits(num = 0) {
      if (num == this.num) return;
      this.num = num;
      this.bits = this.num.toString(2).padStart(this.len, "0");
    }
  },
);

var Hour = GObject.registerClass(
  {
    GTypeName: "Hour",
  },
  class Hour extends St.BoxLayout {
    _init(params = {}) {
      super._init({
        vertical: false,
        style: "spacing: 5px;",
        y_align: Clutter.ActorAlign.END,
      });

      if (params.hour == undefined) {
        params.hour = 0;
      }

      this.hour = params.hour.toString().padStart(2, "0");
      if (this.hour.length !== 2) {
        throw new Error("Hour must be 2 digits long");
      }
      this.col1 = new Column({ len: 2, num: +this.hour[0] });
      this.col2 = new Column({ len: 4, num: +this.hour[1] });

      this.add_child(this.col1);
      this.add_child(this.col2);
    }

    setHour(hour = 0) {
      const paddedHour = hour.toString().padStart(2, "0");
      if (paddedHour == this.hour) return;
      this.hour = paddedHour;
      if (this.hour.length !== 2) {
        throw new Error("Hour must be 2 digits long");
      }

      this.col1.setBits(+this.hour[0]);
      this.col2.setBits(+this.hour[1]);
    }
  },
);

var MinutesOrSeconds = GObject.registerClass(
  {
    GTypeName: "MinutesOrSeconds",
  },
  class MinutesOrSeconds extends St.BoxLayout {
    _init(params = {}) {
      super._init({
        vertical: false,
        style: "spacing: 5px;",
        y_align: Clutter.ActorAlign.END,
      });

      if (params.value === undefined) {
        params.value = 0;
      }

      this.value = params.value.toString().padStart(2, "0");
      if (this.value.length !== 2) {
        throw new Error("Minutes or Seconds must be 2 digits long");
      }
      this.col1 = new Column({ len: 3, num: +this.value[0] });
      this.col2 = new Column({ len: 4, num: +this.value[1] });

      this.add_child(this.col1);
      this.add_child(this.col2);
    }

    setValue(value = 0) {
      if (value < 0 || value > 59) {
        throw new Error("Minutes and Seconds should be in the range [0, 59]");
      }
      const paddedValue = value.toString().padStart(2, "0");
      if (paddedValue == this.value) return;
      this.value = paddedValue;
      if (this.value.length !== 2) {
        throw new Error("Minutes or Seconds must be 2 digits long");
      }

      this.col1.setBits(+this.value[0]);
      this.col2.setBits(+this.value[1]);
    }
  },
);

var Powers = GObject.registerClass(
  { GTypeName: "Powers" },
  class Powers extends St.BoxLayout {
    _init(params = {}) {
      super._init({
        vertical: true,
        style: "spacing: 5px",
        style_class: "powers",
        y_align: Clutter.ActorAlign.END,
      });

      const powers = [8, 4, 2, 1];

      for (const power of powers) {
        const label = new St.Label({
          text: `${power}`,
          y_align: Clutter.ActorAlign.CENTER,
          y_align: Clutter.ActorAlign.CENTER,
        });

        const container = new St.Bin({
          style_class: "bin",
          child: label
        });

        this.add_child(container);
      }
    }
  },
);
