var arr = [];

function unique_id() {
    var n = null;
    do n = Math.floor(Math.random() * 9999);
    while (arr.indexOf(n) !== -1);

    arr.push(n);
    return n;
}

function download(filename, text) {
    var element = document.createElement("a");
    element.setAttribute(
        "href",
        "data:text/plain;charset=utf-8," + encodeURIComponent(text)
    );
    element.setAttribute("download", filename);
    element.style.display = "none";
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
}

function parse_options(str) {
    var list = str;
    if (typeof str === "string" || str instanceof String) {
        list = str.split("|");
    } else list = null;

    if (Array.isArray(list)) {
        if (isNaN(list[0])) list[0] = null;
    }
    return list;
}

function format_sentence(str) {
    var sentence = "";
    if (typeof str === "string" && str != "") {
        str = str.trim();
        str = str.replace(/ +(?= )/g, "");
        var last_char = str[str.length - 1];
        if (
            last_char != "." &&
            last_char != "!" &&
            last_char != ":" &&
            last_char != ";" &&
            last_char != "-"
        )
            str = str + ". ";
        else str = str + " ";
        if (str.substr(str.length - 3, 2) == " .") {
            str = str.substr(0, str.length - 3) + ". ";
        }
        sentence = str;
    }
    return sentence;
}

// If "modules" is not passed then assume you are parsing the modules list
function parseFindings(xml, modules, module_name, dont_parse_modules) {
    var this_is_module = !modules; // this_is_module is true if this is a module

    var elements = [];
    for (i = 0; i < xml.length; i++) {
        if (xml[i].nodeName != "#text") {
            var el = {};
            el.meta = {
                this_is_module: false,
                module_name: "",
            };
            if (this_is_module) {
                el.meta.this_is_module = true;
                el.meta.module_name = module_name;
            }
            el.type = xml[i].nodeName.trim();
            var flags = xml[i].getAttribute("flags");
            if (flags) el.flags = flags;
            else el.flags = "";

            var disabled = xml[i].getAttribute("disabled");
            if (disabled != null && disabled == "true") el.disabled = true;
            else el.disabled = false;
            el.sentencecontinues = xml[i].getAttribute("sentencecontinues");
            var label = xml[i].getAttribute("label");
            if (label) el.label = label;
            else el.no_label = true;

            el.printContents = function() {
                return "";
            };
            el.details_text = "";

            switch (el.type) {
                default:
                    break;
                case "h1":
                case "h2":
                    el.label = xml[i].innerHTML.trim();
                    if (el.type == "h1") el.label = el.label.toUpperCase();
                    //if (el.label[el.label.length - 1] != ":") el.label += ": ";
                    else el.label += " ";
                    el.dont_print = (xml[i].getAttribute("dont_print") == "true") ? true : false;
                    el.print_space = (xml[i].getAttribute("print_space") == "true") ? true : false;
                    el.printContents = function() {
                        var print_text = "";

                        if (this.dont_print == false) {
                            if (this.type == "h1")
                                print_text += "\n\n" + this.label.toUpperCase() + "\n";
                            if (this.type == "h2")
                                print_text += "\n\n" + this.label;
                        }
                        if (this.print_space) {
                            print_text += "\n\n";
                        }

                        return print_text;
                    };
                    el.exportTemplate = function(xml_doc) {
                        // Create structure
                        var xml_el = xml_doc.createElement(this.type);
                        var flags = "";
                        if (this.dont_print)
                            xml_el.setAttribute("dont_print", "true");
                        if (this.print_space)
                            xml_el.setAttribute("print_space", "true");
                        xml_el.innerHTML = this.label;
                        return xml_el;
                    };
                    elements.push(el);
                    break;

                    // Query Insert
                case "query_insert":
                    //el.module = xml[i].innerHTML.trim();
                    el.text = xml[i].innerHTML.trim();
                    el.disappear = (xml[i].getAttribute("disappear") == "true") ? true : false;
                    el.printContents = function() {
                        var print_text = "";
                        return print_text;
                    };
                    el.exportTemplate = function(xml_doc) {
                        var xml_el = xml_doc.createElement(this.type);
                        if (this.disappear)
                            xml_el.setAttribute("disappear", this.disappear);
                        xml_el.innerHTML = this.text;
                        return xml_el;
                    };
                    elements.push(el);
                    break;

                    // TEXT
                case "text":
                    el.text = xml[i].innerHTML.trim();
                    el.printContents = function() {
                        return ""; //this.text + this.details_text;
                    };
                    el.exportTemplate = function(xml_doc) {
                        var xml_el = xml_doc.createElement(this.type);
                        if (this.flags)
                            xml_el.setAttribute("flags", this.flags);
                        xml_el.innerHTML = this.text;
                        return xml_el;
                    };
                    elements.push(el);
                    break;

                    // TEXT ENTRY
                case "text_entry":
                    el.template_text = xml[i].innerHTML.trim();
                    el.text = el.template_text;
                    el.subtype = xml[i].getAttribute("subtype");
                    if (el.subtype) el.subtype = el.subtype.trim();
                    else el.subtype = "medium";
                    el.dont_print_label = (xml[i].getAttribute("dont_print_label") == "true") ? true : false;
                    el.print_text_after =
                        xml[i].getAttribute("print_text_after");
                    if (el.print_text_after) el.print_text_after.trim();
                    else el.print_text_after = "";


                    el.printContents = function() {
                        var print_text = "";
                        if (this.text != "") {
                            if (this.label && !this.dont_print_label)
                                print_text += this.label;
                            if (this.sentencecontinues)
                                print_text += " " + this.text.toLowerCase();
                            else if (this.label) print_text += " " + this.text;
                            else print_text += this.text;
                            print_text += this.print_text_after;
                            print_text += this.details_text;
                            if (this.text + this.details_text != "")
                                print_text = format_sentence(print_text);
                        }
                        return print_text;
                    };
                    el.exportTemplate = function(xml_doc) {
                        var xml_el = xml_doc.createElement(this.type);
                        if (this.label)
                            xml_el.setAttribute("label", this.label);
                        xml_el.setAttribute("subtype", this.subtype);
                        if (this.print_text_after)
                            xml_el.setAttribute(
                                "print_text_after",
                                this.print_text_after
                            );
                        if (this.dont_print_label)
                            xml_el.setAttribute(
                                "dont_print_label",
                                this.dont_print_label
                            );
                        xml_el.innerHTML = this.template_text;
                        return xml_el;
                    };
                    elements.push(el);
                    break;

                case "selection":
                    op_values = xml[i].innerHTML.trim().split("|");
                    el.selected = "";
                    el.label = label;
                    el.options = [];
                    el.dont_print_label = (xml[i].getAttribute("dont_print_label") == "false") ? false : true;

                    for (var x = 0; x < op_values.length; x++) {
                        if (op_values[x].trim() != "") {
                            el.options.push({
                                text: op_values[x].trim(),
                                value: x + 1,
                            });
                        }
                    }

                    el.options.splice(0, 0, {
                        text: "",
                        value: 0,
                    });

                    el.options.push({
                        text: "Other",
                        value: el.options.length,
                    });
                    el.printContents = function() {
                        var print_text = ""

                        if (
                            Number.isInteger(this.selected) &&
                            this.options[this.selected].text != "Other"
                        ) {
                            if (!this.dont_print_label) print_text += this.label + " ";
                            print_text += format_sentence(
                                this.options[this.selected].text
                            );
                        }
                        if (this.details)
                            print_text += format_sentence(this.details_text);
                        return format_sentence(print_text);
                    };

                    var showdetailson = xml[i].getAttribute("showdetailson");
                    if (showdetailson) el.showdetailson = Number(showdetailson);
                    else el.showdetailson = el.options.length - 1;

                    el.exportTemplate = function(xml_doc) {
                        var xml_el = xml_doc.createElement(this.type);
                        if (this.dont_print_label) xml_el.setAttribute("dont_print_label", this.dont_print_label);
                        if (this.label)
                            xml_el.setAttribute("label", this.label);
                        var options = "";
                        for (var n = 0; n < this.options.length; n++) {
                            if (
                                this.options[n].text != "Other" &&
                                this.options[n].text.trim() != ""
                            ) {
                                options += this.options[n].text;
                                if (
                                    n != this.options.length - 1 &&
                                    this.options[n + 1].text.trim() != ""
                                )
                                    options += " | ";
                            }
                        }
                        xml_el.innerHTML = options;
                        return xml_el;
                    };
                    elements.push(el);
                    break;

                case "multi_select":
                    var nodes = xml[i].childNodes;
                    el.multi = [];
                    el.present_options = ["No", "Yes"];
                    el.present = "";
                    el.askfurtherdetails =
                        xml[i].getAttribute("askfurtherdetails");
                    el.normaltext = xml[i].getAttribute("normaltext");

                    for (var n = 0; n < nodes.length; n++) {
                        if (nodes[n].nodeName != "#text") {
                            var type = nodes[n].nodeName.trim();
                            if (flags == null) flags = " ";
                            var label = nodes[n].getAttribute("label");
                            if (label) label.trim();
                            var inner_text = nodes[n].innerHTML;
                            if (inner_text) inner_text = inner_text.trim();
                            var dont_print_label = (nodes[n].getAttribute("dont_print_label") == "false") ? false : true;
                            var print_text_before = nodes[n].getAttribute("print_text_before") ? nodes[n].getAttribute("print_text_before").trim() : "";
                            var print_text_after = nodes[n].getAttribute("print_text_after") ? nodes[n].getAttribute("print_text_after").trim() : "";

                            var multi = {};
                            text = "";
                            selection = "";

                            if (type == "free_text") {
                                el.multi.push({
                                    text: inner_text,
                                    label: label,
                                    type: type,
                                    dont_print_label: dont_print_label,
                                    print_text_before: print_text_before,
                                    print_text_after: print_text_after,
                                    showdetailson: showdetailson,
                                });
                            }
                            if (type == "dropdown") {
                                var options = [];
                                var selected = null;
                                if (inner_text.includes("|")) {
                                    op_values = inner_text.split("|");
                                    options.push({
                                        // Add a non-selection first
                                        text: "",
                                        value: 0,
                                    });
                                    for (var x = 0; x < op_values.length; x++) {
                                        if (op_values[x].trim() != "")
                                            options.push({
                                                text: op_values[x].trim(),
                                                value: x + 1, // Therefore value needs to start at 1
                                            });
                                    }
                                } else {
                                    options.push({
                                        // Add a non-selection first
                                        text: "",
                                        value: 0,
                                    });
                                    options.push({
                                        text: inner_text.trim(),
                                        value: 1,
                                    });
                                }

                                options.push({
                                    text: "Other",
                                    value: options.length,
                                });

                                var print_text_before =
                                    nodes[n].getAttribute("print_text_before");
                                if (print_text_before) print_text_before.trim();
                                else print_text_before = "";
                                var print_text_after =
                                    nodes[n].getAttribute("print_text_after");
                                if (print_text_after) print_text_after.trim();
                                else print_text_after = "";
                                var multi = {};
                                text = "";
                                label = label.trim();
                                selection = "";

                                el.multi.push({
                                    label: label,
                                    other: true,
                                    text: "",
                                    options: options,
                                    type: type,
                                    print_text_before: print_text_before,
                                    print_text_after: print_text_after,
                                    selected: selected,
                                    showdetailson: showdetailson,
                                });
                            }
                        }
                    }
                    el.printContents = function() {
                        var print_text = "";
                        if (
                            this.present == "Yes" ||
                            this.askfurtherdetails != "true"
                        ) {

                            for (var n = 0; n < this.multi.length; n++) {
                                var print_text_in = "";

                                if (this.multi[n].type == "free_text") {
                                    if (this.multi[n].text != "") {
                                        if (
                                            this.multi[n].print_text_before !=
                                            ""
                                        ) {
                                            print_text_in +=
                                                this.multi[n]
                                                .print_text_before + " ";
                                        }

                                        print_text_in += this.multi[n].text;
                                        if (
                                            this.multi[n].print_text_after && this.multi[n].print_text_after != ""
                                        ) {
                                            if (
                                                this.multi[
                                                    n
                                                ].print_text_after.trim() != "."
                                            )
                                                print_text_in += " ";
                                            print_text_in +=
                                                this.multi[n].print_text_after;
                                        }
                                        print_text_in += " ";
                                    }
                                }

                                if (this.multi[n].type == "dropdown") {
                                    if (
                                        Number.isInteger(
                                            this.multi[n].selected
                                        )
                                    ) {
                                        if (
                                            this.multi[n].print_text_before !=
                                            ""
                                        ) {
                                            print_text_in +=
                                                this.multi[n]
                                                .print_text_before + " ";
                                        }
                                        var value =
                                            this.multi[n].options[
                                                this.multi[n].selected
                                            ].text;
                                        if (value == "Other")
                                            value = this.multi[n].text;
                                        print_text_in += value + " ";
                                        if (
                                            this.multi[n].print_text_after != ""
                                        ) {
                                            print_text_in +=
                                                this.multi[
                                                    n
                                                ].print_text_after.trim() + " ";
                                        }
                                        if (
                                            print_text_in.substr(
                                                print_text_in.length - 3,
                                                2
                                            ) == " ."
                                        ) {
                                            print_text_in =
                                                print_text_in.substr(
                                                    0,
                                                    print_text_in.length - 3
                                                ) + ". ";
                                        }
                                    }
                                }

                                print_text += print_text_in;

                            }
                        }
                        if (this.present == "Yes") {
                            print_text =
                                format_sentence(print_text) +
                                format_sentence(this.details_text);
                        } else {
                            print_text = format_sentence(print_text);
                        }
                        if (this.present == "No") {
                            print_text += format_sentence(this.normaltext);
                        }
                        return print_text;
                    };
                    el.exportTemplate = function(xml_doc) {
                        // Create structure
                        //var xml_doc = document.implementation.createDocument("", "", null);
                        var xml_el = xml_doc.createElement(this.type);
                        if (this.label)
                            xml_el.setAttribute("label", this.label);
                        if (this.askfurtherdetails)
                            xml_el.setAttribute(
                                "askfurtherdetails",
                                this.askfurtherdetails
                            );
                        if (this.normaltext)
                            xml_el.setAttribute("normaltext", this.normaltext);

                        var multi_txt = "";
                        for (var n = 0; n < this.multi.length; n++) {
                            var xml_multi = xml_doc.createElement(
                                this.multi[n].type
                            );
                            xml_multi.setAttribute(
                                "label",
                                this.multi[n].label
                            );
                            if (this.multi[n].print_text_before)
                                xml_multi.setAttribute(
                                    "print_text_before",
                                    this.multi[n].print_text_before
                                );
                            if (this.multi[n].dont_print_label)
                                xml_multi.setAttribute(
                                    "dont_print_label",
                                    this.multi[n].dont_print_label
                                );

                            if (this.multi[n].print_text_after)
                                xml_multi.setAttribute(
                                    "print_text_after",
                                    this.multi[n].print_text_after
                                );

                            if (this.multi[n].type == "dropdown") {
                                var multi_options = "";
                                for (
                                    var nn = 0; nn < this.multi[n].options.length; nn++
                                ) {
                                    if (
                                        this.multi[n].options[nn].text !=
                                        "Other" &&
                                        this.multi[n].options[nn].text.trim() !=
                                        ""
                                    ) {
                                        multi_options +=
                                            this.multi[n].options[nn].text;
                                        if (
                                            nn !=
                                            this.multi[n].options.length -
                                            1 &&
                                            this.multi[n].options[
                                                nn + 1
                                            ].text.trim() != ""
                                        )
                                            multi_options += " | ";
                                    }
                                }
                                xml_multi.innerHTML = multi_options;
                            }
                            xml_el.appendChild(xml_multi);
                        }

                        return xml_el;
                    };
                    //console.log(el)
                    elements.push(el);
                    break;

                case "multi_radio":
                    var nodes = xml[i].childNodes;
                    el.multi = [];
                    for (var n = 0; n < nodes.length; n++) {
                        if (nodes[n].nodeName == "radio") {


                            var dont_print_normal = false;
                            if (
                                nodes[n].getAttribute("dont_print_normal") &&
                                nodes[n].getAttribute("dont_print_normal") ==
                                "true"
                            )
                                dont_print_normal = true;

                            var inner_text = nodes[n].innerHTML.trim();
                            var options = [];
                            var type = "";
                            if (inner_text.includes("|")) {
                                op_values = inner_text.split("|");

                                for (var x = 0; x < op_values.length; x++) {
                                    options.push({
                                        text: op_values[x].trim(),
                                        value: x,
                                    });
                                }
                                type = "radio";
                            } else {
                                options[0] = inner_text;
                                type = "free_text";
                            }

                            var label = nodes[n].getAttribute("label");
                            var normaltext =
                                nodes[n].getAttribute("normaltext");

                            var selected = "";

                            var showdetailson =
                                nodes[n].getAttribute("showdetailson");
                            if (showdetailson)
                                showdetailson = Number(showdetailson);
                            else showdetailson = 1;

                            el.multi.push({
                                label: label,
                                options: options,
                                type: type,
                                selected: selected,
                                showdetailson: showdetailson,
                                details: "",
                                normaltext: normaltext,
                                dont_print_normal: dont_print_normal,
                            });
                        }
                    }
                    el.printContents = function() {
                        var print_multi = _.cloneDeep(this.multi);
                        print_multi.sort((a, b) => {
                            return b.selected - a.selected;
                        });

                        var print_text = "";
                        for (var n = 0; n < print_multi.length; n++) {
                            if (Number.isInteger(print_multi[n].selected)) {
                                // Normal and don't print if normal flag
                                if (
                                    print_multi[n].selected == 0 &&
                                    print_multi[n].dont_print_normal
                                ) {}
                                // Normal and supplied negative text
                                else if (
                                    print_multi[n].selected == 0 &&
                                    print_multi[n].normaltext
                                ) {
                                    print_text += print_multi[n].normaltext;
                                }
                                // Normal and no supplied text
                                else if (
                                    print_multi[n].selected == 0 &&
                                    !print_multi[n].normaltext
                                ) {
                                    print_text += print_multi[n].label;
                                    print_text +=
                                        ": " +
                                        print_multi[n].options[
                                            print_multi[n].selected
                                        ].text;
                                }
                                // Abnormal and details given
                                else if (
                                    print_multi[n].selected != 0 &&
                                    print_multi[n].details != ""
                                ) {
                                    print_text += print_multi[n].details;
                                }
                                // Abnormal and no details given
                                else if (
                                    print_multi[n].selected != 0 &&
                                    print_multi[n].details == ""
                                ) {
                                    print_text += print_multi[n].label;
                                    print_text +=
                                        ": " +
                                        print_multi[n].options[
                                            print_multi[n].selected
                                        ].text.toLowerCase();
                                }
                                print_text = format_sentence(print_text);
                            }
                        }
                        return print_text;
                    };
                    el.exportTemplate = function(xml_doc) {
                        var xml_el = xml_doc.createElement(this.type);
                        if (this.label)
                            xml_el.setAttribute("label", this.label);
                        if (this.askfurtherdetails)
                            xml_el.setAttribute(
                                "askfurtherdetails",
                                this.askfurtherdetails
                            );

                        var multi_txt = "";
                        for (var n = 0; n < this.multi.length; n++) {
                            var xml_multi = xml_doc.createElement(
                                this.multi[n].type
                            );
                            xml_multi.setAttribute(
                                "label",
                                this.multi[n].label
                            );
                            if (this.multi[n].normaltext)
                                xml_multi.setAttribute(
                                    "normaltext",
                                    this.multi[n].normaltext
                                );
                            if (this.multi[n].dont_print_normal)
                                xml_multi.setAttribute(
                                    "dont_print_normal",
                                    this.multi[n].dont_print_normal
                                );

                            if (this.multi[n].type == "radio") {
                                var multi_options = "";
                                for (
                                    var nn = 0; nn < this.multi[n].options.length; nn++
                                ) {
                                    multi_options +=
                                        this.multi[n].options[nn].text;
                                    if (nn != this.multi[n].options.length - 1)
                                        multi_options += " | ";
                                }
                                xml_multi.innerHTML = multi_options;
                            }
                            xml_el.appendChild(xml_multi);
                        }

                        return xml_el;
                    };
                    elements.push(el);
                    break;

                case "multi_checkbox":
                    var nodes = xml[i].childNodes;
                    el.multi = [];
                    for (var n = 0; n < nodes.length; n++) {
                        if (nodes[n].nodeName == "checkbox") {
                            var text = nodes[n].innerHTML.trim();
                            var label = nodes[n].getAttribute("label") + ":";
                            var selected = "";

                            el.multi.push({
                                label: label,
                                text: text,
                                selected: selected,
                                type: "checkbox",
                            });
                        }
                    }
                    el.printContents = function() {
                        var print_text = "";
                        var total_selected = 0;
                        var count_selected = 0;
                        for (var n = 0; n < this.multi.length; n++) {
                            if (this.multi[n].selected) total_selected++;
                        }

                        if (total_selected) {
                            print_text += this.label + " ";
                            for (var n = 0; n < this.multi.length; n++) {
                                if (this.multi[n].selected) {
                                    print_text +=
                                        this.multi[n].text;
                                    if (
                                        count_selected < total_selected - 1 &&
                                        total_selected != 2
                                    )
                                        print_text += ", ";
                                    if (count_selected == total_selected - 2)
                                        print_text += " and ";
                                    count_selected++;
                                }
                            }
                        }
                        return format_sentence(print_text);
                    };
                    el.exportTemplate = function(xml_doc) {
                        var xml_el = xml_doc.createElement(this.type);
                        if (this.label)
                            xml_el.setAttribute("label", this.label);

                        if (this.askfurtherdetails)
                            xml_el.setAttribute(
                                "askfurtherdetails",
                                this.askfurtherdetails
                            );

                        for (var n = 0; n < this.multi.length; n++) {
                            var xml_multi = xml_doc.createElement(
                                this.multi[n].type
                            );
                            if (this.multi[n].type == "checkbox") {
                                xml_multi.innerHTML = this.multi[n].text;
                            }
                            xml_el.appendChild(xml_multi);
                        }
                        return xml_el;
                    };
                    elements.push(el);
                    break;

                case "insert":
                    el.module = xml[i].innerHTML.trim();

                    var x = modules.findIndex((n) => {
                        return n.name == el.module;
                    });
                    if (x == -1) break;

                    if (x != -1 && dont_parse_modules != true) {
                        var id = unique_id();
                        var mods = _.cloneDeep(modules[x].elements);
                        mods.forEach((n) => {
                            n.meta.id = id;
                            n.meta.module_name = el.module
                        });
                        //console.log(mods)
                        elements = elements.concat(mods);
                    } else {
                        el.exportTemplate = function(xml_doc) {
                            var xml_el = xml_doc.createElement(this.type);
                            xml_el.innerHTML = this.module.trim();
                            return xml_el;
                        };

                        elements.push(el);
                    }
                    break;
            }
        }
    }
    return elements;
}

function parseModules(xml, name) {
    return parseFindings(xml, null, name);
}

function parseXML(xmlDoc, temp) {
    // Load array of report templates
    if (xmlDoc == null) return;

    var modules_xml = xmlDoc.getElementsByTagName("module");
    var modules = [];
    for (var i = 0; i < modules_xml.length; i++) {
        var m_name = xmlDoc
            .getElementsByTagName("module")[i].getElementsByTagName("name")[0]
            .innerHTML.replace(/^\s+|\s+$/g, "");
        var m_content = xmlDoc
            .getElementsByTagName("module")[i].getElementsByTagName("content")[0].childNodes;
        var elements = parseModules(m_content, m_name);
        modules.push({
            name: m_name,
            elements: elements,
            xml: xmlDoc
                .getElementsByTagName("module")[i].querySelector(
                    "content")
        });
    }

    var t = xmlDoc.getElementsByTagName("template");

    for (var i = 0; i < t.length; i++) {
        var t_name = t[i]
            .querySelector("name")
            .innerHTML.replace(/\t/g, "")
            .trim();
        var t_modality = t[i].querySelector("modality");
        if (t_modality)
            t_modality = t_modality.innerHTML.replace(/\t/g, "").trim();
        var t_region = t[i].querySelector("region");
        if (t_region) t_region = t_region.innerHTML.replace(/\t/g, "").trim();
        var t_specialty = t[i].querySelector("specialty");
        if (t_specialty)
            t_specialty = t_specialty.innerHTML.replace(/\t/g, "").trim();
        var t_findings = t[i].querySelector("content").childNodes;
        var elements = parseFindings(t_findings, modules);

        temp.push({
            name: t_name,
            specialty: t_specialty,
            region: t_region,
            modality: t_modality,
            elements: elements,
            xml: t[i].querySelector(
                "content")
        });
    }
    temp.modules = modules;
    temp.source_xml = t;

    temp.sort((a, b) => {
        return a.name > b.name;
    });
    temp.modules.sort((a, b) => {
        return a.name > b.name;
    });
    return temp;
}

function loadXML(path_template, path_user) {
    var xhttp = new XMLHttpRequest();
    var temp = [];
    xhttp.onreadystatechange = function() {
        if (this.readyState == 4 && this.status == 200) {
            temp = parseXML(this.responseXML, temp);

        }
    };
    xhttp.open("GET", path_template, true);
    xhttp.send();

    return temp;
}

// Saves the user templates and modules to server
function updateUserDatabase(user_templates, user_modules) {
    var save_doc = document.implementation.createDocument("", "", null);
    var all = save_doc.createElement("all");
    save_doc.appendChild(all);

    // Adds the templates
    for (var n = 0; n < user_templates.length; n++) {
        var template = save_doc.createElement("template");
        var name = save_doc.createElement("name");
        name.innerHTML = user_templates[n].name;
        template.appendChild(name);
        var modality = save_doc.createElement("modality");
        modality.innerHTML = user_templates[n].modality;
        template.appendChild(modality);
        var region = save_doc.createElement("region");
        region.innerHTML = user_templates[n].region;
        template.appendChild(region);
        var specialty = save_doc.createElement("specialty");
        specialty.innerHTML = user_templates[n].specialty;
        template.appendChild(specialty);
        var content = save_doc.createElement("content");
        content = user_templates[n].xml
        template.appendChild(content);
        all.appendChild(template);
    }

    // Adds the modules
    for (var n = 0; n < user_modules.length; n++) {
        var el = save_doc.createElement("el");
        el = module_to_xml(user_modules[n], save_doc);

        all.appendChild(el);
    }

    var xml = (new XMLSerializer()).serializeToString(save_doc);
    var entry = {
        xml: xml
    }

    fetch(`${window.origin}/index/export`, {
            method: "POST",
            credentials: "include",
            body: JSON.stringify(entry),
            cache: "no-cache",
            headers: new Headers({
                "content-type": "application/json"
            })
        })
        .then(function(response) {
            if (response.status !== 200) {
                console.log(`Looks like there was a problem. Status code: ${response.status}`);
                return;
            }
        })
        .catch(function(error) {
            console.log("Fetch error: " + error);
        });
}

function merge_templates(master_templates, user_templates, overwrite = true) {
    if (!master_templates) master_templates = user_templates;
    for (var n = 0; n < user_templates.length; n++) {
        var exists_in_master = null;
        for (var nn = 0; nn < master_templates.length; nn++) {
            if (user_templates[n].name == master_templates[nn].name) {
                if (overwrite == true) {
                    master_templates[nn] = user_templates[n];
                    exists_in_master = true;
                } else {
                    var new_name = user_templates[n].name;
                    user_templates[n].name = user_templates[n].name + " imported";
                    exists_in_master = true;
                }
            }
        }
        if (!exists_in_master) {
            master_templates.push(user_templates[n]);
        }
    }
    return master_templates;
}

function template_to_xml(template_gui, xml_doc) {

    var template = xml_doc.createElement("template");
    var name = xml_doc.createElement("name");
    name.innerHTML = template_gui.name;
    template.appendChild(name);
    var modality = xml_doc.createElement("modality");
    modality.innerHTML = template_gui.modality;
    template.appendChild(modality);
    var region = xml_doc.createElement("region");
    region.innerHTML = template_gui.region;
    template.appendChild(region);
    var specialty = xml_doc.createElement("specialty");
    specialty.innerHTML = template_gui.specialty;
    template.appendChild(specialty);

    var content = xml_doc.createElement("content");
    template.appendChild(content);

    for (var n = 0; n < template_gui.length; n++) {
        content.appendChild(template_gui[n].exportTemplate(xml_doc));
    }

    return template;
}

function module_to_xml(template_gui, xml_doc) {
    var template = xml_doc.createElement("module");
    var name = xml_doc.createElement("name");
    name.innerHTML = template_gui.name;
    template.appendChild(name);

    var content = xml_doc.createElement("content");
    template.appendChild(content);

    for (var n = 0; n < template_gui.elements.length; n++) {
        content.appendChild(template_gui.elements[n].exportTemplate(xml_doc));
    }

    return template;
}


function parse_radreport(xml, specialty, modality, region) {


    var parser = new DOMParser();
    xmlDoc = parser.parseFromString(xml, "text/xml");
    if (!xmlDoc) return;
    var converted = document.implementation.createDocument(null, "template");
    var c_template = converted.querySelector("template");
    var name = converted.createElement("name");
    name.innerHTML = xmlDoc.querySelector("title").innerHTML + " (radreport.org)";
    c_template.appendChild(name);
    var x_modality = converted.createElement("modality");
    x_modality.innerHTML = modality
    var x_specialty = converted.createElement("specialty");
    x_specialty.innerHTML = specialty
    var x_region = converted.createElement("region");
    x_region.innerHTML = region
    c_template.appendChild(x_modality);
    c_template.appendChild(x_specialty);
    c_template.appendChild(x_region);
    var content = converted.createElement("content");
    c_template.appendChild(content);

    var section = xmlDoc.getElementsByTagName("section");

    for (var n = 0; n < section.length; n++) {
        if (section[n].querySelector("header")) {
            if (section[n].querySelector("header").getAttribute("class").toLowerCase() == "level1") {
                var header = converted.createElement("h1");
                header.innerHTML = section[n].querySelector("header").innerHTML.replace(/\t/g, "").trim();
                content.appendChild(header);
            }
        }

        if (section[n].hasChildNodes()) {
            var child = section[n].firstChild;
            while (child) {
                if (child.nodeName.toLowerCase() == "section") {
                    if (child.getAttribute("class").toLowerCase() == "level2") {
                        var innerHTML = child.querySelector("header").innerHTML.trim();
                        var header2;
                        if (innerHTML != "") {
                            if (innerHTML.length < 75) {
                                header2 = converted.createElement("h2");
                                header2.setAttribute("print_space", "true")
                            } else header2 = converted.createElement("text");
                            header2.innerHTML = child.querySelector("header").innerHTML.trim();
                            content.appendChild(header2);
                        }
                    }
                }
                if (child.hasChildNodes()) {
                    var grandchild = child.firstChild;
                    while (grandchild) {
                        switch (grandchild.nodeName.toLowerCase()) {
                            default:
                                break
                            case "textarea":
                            case "input":
                                var text_entry = converted.createElement("text_entry");
                                if (grandchild.nodeName.toLowerCase() == "textarea") text_entry.setAttribute("subtype", "medium");
                                else text_entry.setAttribute("subtype", "small");
                                if (grandchild.innerHTML) text_entry.innerHTML = grandchild.innerHTML.replace(/\t/g, "").trim();
                                var id = grandchild.getAttribute("id");
                                var label = null;
                                if (id) label = child.querySelector("label[for='" + id + "']");
                                if (label) label = label.innerHTML.replace(/\t/g, "").trim();
                                else if (grandchild.getAttribute("name")) {
                                    label = grandchild.getAttribute("name").trim();
                                }
                                if (label) text_entry.setAttribute("label", label);
                                text_entry.setAttribute("dont_print_label", "false");
                                content.appendChild(text_entry);
                                break;
                            case "select":
                                var selection = converted.createElement("selection");
                                content.appendChild(selection);
                                var id = grandchild.getAttribute("id");
                                var label = child.querySelector("label[for='" + id + "']");
                                if (label) label = label.innerHTML.trim();
                                if (label) selection.setAttribute("label", label);
                                selection.setAttribute("dont_print_label", "false");
                                var option = grandchild.getElementsByTagName("option");
                                var selection_options = "";
                                for (var nnn = 0; nnn < option.length; nnn++) {
                                    selection_options += option[nnn].innerHTML + "|";
                                }
                                selection.innerHTML = selection_options;
                                break
                            case "span":
                                var id = grandchild.getAttribute("id");
                                var label = child.querySelector("label[for='" + id + "']");
                                if (label) label = label.innerHTML.trim();

                                if (grandchild.getAttribute("data-field-type") == "RADIO") {
                                    var selection = converted.createElement("selection");
                                    content.appendChild(selection);
                                    if (label) selection.setAttribute("label", label + ":");
                                    selection.setAttribute("dont_print_label", "false");
                                    var option = grandchild.getElementsByTagName("input");
                                    var selection_options = "";
                                    for (var nnn = 0; nnn < option.length; nnn++) {
                                        var inner_label = ""
                                        if (option[nnn].getAttribute("value")) inner_label = option[nnn].getAttribute("value");
                                        else if (option[nnn].innerHTML) inner_label = option[nnn].innerHTML;
                                        selection_options += inner_label + "|";
                                    }
                                    selection.innerHTML = selection_options;
                                }
                                if (grandchild.querySelector("input").getAttribute("type") == "number") {
                                    var text_option = grandchild.getElementsByTagName("input");
                                    for (var nnn = 0; nnn < text_option.length; nnn++) {
                                        var text_entry = converted.createElement("text_entry");
                                        text_entry.setAttribute("subtype", "small");
                                        text_entry.setAttribute("dont_print_label", "false");
                                        if (text_option[nnn].getAttribute("value")) text_entry.setAttribute("label", text_option[nnn].getAttribute("value"))
                                        else if (text_option.length == 1) {
                                            id = text_option[nnn].getAttribute("id");
                                            label = child.querySelector("label[for='" + id + "']");
                                            if (label) label = label.innerHTML.trim();
                                            text_entry.setAttribute("label", label);
                                        }
                                        content.appendChild(text_entry);
                                    }
                                }
                                if (grandchild.getAttribute("data-field-type") == "CHECKBOX") {
                                    var multi_checkbox = converted.createElement("multi_checkbox");
                                    content.appendChild(multi_checkbox);
                                    if (label) multi_checkbox.setAttribute("label", label + ":");
                                    multi_checkbox.setAttribute("dont_print_label", "false");
                                    var option = grandchild.getElementsByTagName("input");
                                    for (var nnn = 0; nnn < option.length; nnn++) {
                                        var checkbox = converted.createElement("checkbox");
                                        multi_checkbox.appendChild(checkbox);
                                        if (option[nnn].getAttribute("value")) checkbox.innerHTML = option[nnn].getAttribute("value")
                                        else if (option[nnn].innerHTML) checkbox.innerHTML = option[nnn].innerHTML;
                                    }
                                }
                                break
                        }
                        grandchild = grandchild.nextSibling;
                    }
                }
                child = child.nextSibling;
            }
        }
    }
    var user = [];
    user.push({
        name: name.innerHTML,
        specialty: specialty.innerHTML,
        region: region.innerHTML,
        modality: modality.innerHTML,
        xml: converted.querySelector("content")
    });
    return user;
}

function array_to_options(a) {
    var new_array = [];
    a.forEach((n) => {
        new_array.push({ text: n, value: n });
    });

    return new_array;
}

function save_to_file(data, filename, type) {
    var file = new Blob([data], { type: type });
    if (window.navigator.msSaveOrOpenBlob) // IE10+
        window.navigator.msSaveOrOpenBlob(file, filename);
    else { // Others
        var a = document.createElement("a"),
            url = URL.createObjectURL(file);
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        setTimeout(function() {
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
        }, 0);
    }
}

function save_prefs(prefs) {
    var obj = {
        prefs: prefs
    }
    fetch(`${window.origin}/save-prefs`, {
            method: "POST",
            credentials: "include",
            body: JSON.stringify(prefs),
            cache: "no-cache",
            headers: new Headers({
                "content-type": "application/json"
            })
        })
        .then(response => {
            if (response.ok) {

            }
            if (response.status !== 200) {
                alert("Failure " + response.status)
                return;
            }
            return response.json()
        })
        .catch(function(error) {
            console.log("Fetch error: " + error);
        });

}

function toTitleCase(str) {
    return str.replace(
        /\w\S*/g,
        function(txt) {
            return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
        }
    );
}


function find_modules(xml, modules, list) {
    for (var n = 0; n < xml.length; n++) {
        if (xml[n].nodeName.trim() == "insert" || xml[n].nodeName.trim() == "query_insert") {
            var name = xml[n].innerHTML.trim();
            var x = modules.find(n => {
                return n.name == name;
            });

            if (x) find_modules(x.xml.childNodes, modules, list);

            if (x) list.push({
                "name": name,
                "type": 1, //Type 1 = module
                "xml": x.xml.innerHTML
            });
        }
    }
}