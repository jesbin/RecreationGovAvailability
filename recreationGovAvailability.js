/*
  Recreation.gov Campsite Availability
  Fetches availabilty for a given campground and months, aggregates it and displays all availability dates in
    those months.
  Paste this code into the console after navigating to recreation.gov to build the app.

  Sample availability endpoint (with start date specifier):
     https://www.recreation.gov/api/camps/availability/campground/232487/month?start_date=2020-08-01T00%3A00%3A00.000Z
  Sample campground endpoint:
    https://www.recreation.gov/api/camps/campgrounds/250005
  Sample campsites endpoint:
     https://www.recreation.gov/api/camps/campsites/4522

  Sample campground website link:
    https://www.recreation.gov/camping/campgrounds/250005

*/

const fetchCampsite = (campsite) => fetch(`/api/camps/campsites/${campsite}`);
const fetchAvailability = (campground, year, monthNum) => fetch(`/api/camps/availability/campground/${campground}/month?start_date=${String(year).padStart(4,'20')}-${String(monthNum).padStart(2,'0')}-01T00%3A00%3A00.000Z`);
const fetchCampground = (campground) => fetch(`/api/camps/campgrounds/${campground}`);
const fetchCampgroundSearch = (query) => fetch(`/api/search?q=${encodeURIComponent(query)}&entity_type=campground&inventory_type=camping`);

const MONTHS_MAP = {
    1: "January",
    2: "February",
    3: "March",
    4: "April",
    5: "May",
    6: "June",
    7: "July",
    8: "August",
    9: "September",
    10: "October",
    11: "November",
    12: "December"
};

const DEFAULT_HEADER_BOX_STYLE_MIXIN = "border: 1px solid black; border-radius: 8px; text-align: center; background-color: #333; color: white;";
const DEFAULT_TITLE_BOX_STYLE = `${DEFAULT_HEADER_BOX_STYLE_MIXIN} padding: 6px;`;
const DEFAULT_H2_BOX_STYLE = `${DEFAULT_HEADER_BOX_STYLE_MIXIN} padding: 3px; margin: 10px 0px;`;

let DEFAULT_CAMPGROUND = 232487;

function setTitle(campgroundID) {
    if (campgroundID) {
        document.title = `Availability: ${campgroundID}`;
    } else {
        document.title = `Rec.gov Availability`;
    }
}

function campgroundWebsiteLink(campgroundID) {
    return `https://www.recreation.gov/camping/campgrounds/${campgroundID}`;
}

function createCampsitesAvailabilityTables(availabilityData) {
    const RESERVED = "Reserved";
    const AVAILABLE = "Available";

    const campsitesAvailability = availabilityData.campsites;
    // MAP: {
    //  [site name (e.g. 'A10')]: [availability table for that site]
    // }
    const campsiteSiteAvailabilityMap = Object.keys(campsitesAvailability).reduce((agg, campsiteID) => {
        const csa = campsitesAvailability[campsiteID];
        const { site, availabilities } = csa;
        const availDates = Object.keys(availabilities).reduce((dates, dt) => {
           const isAvail = availabilities[dt] === AVAILABLE;
           if (isAvail) {
            dates.push((new Date(dt)));
           }
           return dates;
        }, []);
       
        if (availDates.length > 0) {
            const availabilityTbl = createAvailabilityTable(site, availDates);
            agg[site] = availabilityTbl;
        }
        return agg;
    }, {});

    const availabilityTables = Object.keys(campsiteSiteAvailabilityMap).sort().map(site => {
        const availabilityTbl = campsiteSiteAvailabilityMap[site];
        return availabilityTbl;
    });
    return availabilityTables;
}

function createAvailabilityTable(site, availDates) {
    // console.log(`Creating Table for ${site}`);
    const tbl = document.createElement('table');
    const thd = document.createElement('thead');
    const thdRow = document.createElement('tr');
    const thdCell = document.createElement('th');
    thdCell.innerText = site;

    thdRow.appendChild(thdCell);
    thd.appendChild(thdRow);
    tbl.appendChild(thd);
   
    const tbod = document.createElement('tbody');
    tbl.appendChild(tbod);
    availDates.forEach(availDate => {
        const dateString = availDate.toLocaleDateString();
        const row = document.createElement('tr');
        const cell = document.createElement('td');
        cell.innerText = dateString;
        row.appendChild(cell)
        tbod.appendChild(row);
    });
    return tbl;
}

function fetchAvailabilityandAggregate(campgroundID, availabilityYear, availabilityMonths, availabilityCallback) {
    Promise.all(availabilityMonths.map(availMonth => fetchAvailability(campgroundID, availabilityYear, availMonth)))
        .then(responses => {
            console.log(`Availability fetched`);
            Promise.all(responses.map(resp => resp.json()))
                .then(monthlyAvailabilities => {
                    const aggregatedAvailability = monthlyAvailabilities.reduce((agg, avail) => {
                        Object.keys(avail.campsites).forEach(campsiteID => {
                            const cs = avail.campsites[campsiteID];
                            const currentAvailabilities = agg.campsites[campsiteID] ? agg.campsites[campsiteID].availabilities : {};
                            agg.campsites[campsiteID] = {
                                ...agg.campsites[campsiteID],
                                ...cs,
                                availabilities: {
                                    ...currentAvailabilities,
                                    ...cs.availabilities
                                }
                            }
                        });
                        return agg;
                    }, { campsites: {} });
                    availabilityCallback(aggregatedAvailability);
                })
        })
        .catch(err => console.log(err.message));
}

function setUpUI(defaultCampground) {
    document.body.innerText = "";

    // Setting global styles
    const STYLE_RULES = `
        * {
            font-family: "Helvetica", Arial, sans-serif;
        }

        a {
            color: #5af;
        }

        button {
            background-color: #333;
            color: white;
            border-radius: 3px;
            border-color: black;
            padding: 6px;
            font-size: 1em;
        }

        button:hover {
            background-color: #666;
        }

        button:active {
            color: #999;
        }

        input {
            border: 1px solid #333;
            border-radius: 3px;
            margin: 6px 0px;
            padding: 3px;
        }

        label {
            margin: 6px 0px;
        }

        table {
            border: 2px solid black;
            margin: 5px;
            display: inline;
        }

        thead {}

        tbody {
            border: 1px solid black;
        }

        th {
            font-weight: bold;
        }

        th, td {
            text-align: center;
            vertical-align: middle;
        }

        .cg-tag {
            display: inline-flex;
            align-items: center;
            gap: 4px;
            background: #333;
            color: white;
            border-radius: 3px;
            padding: 2px 8px;
            font-size: 0.88em;
            margin: 2px;
        }

        .cg-tag button {
            background: none;
            border: none;
            color: white;
            cursor: pointer;
            padding: 0 0 0 2px;
            font-size: 1.1em;
            line-height: 1;
        }

        .cg-dropdown {
            position: absolute;
            top: 100%;
            left: 0;
            background: white;
            border: 1px solid #333;
            border-radius: 3px;
            max-height: 220px;
            overflow-y: auto;
            z-index: 200;
            width: 320px;
            box-shadow: 0 4px 8px rgba(0,0,0,0.15);
        }

        .cg-dropdown-item {
            padding: 7px 10px;
            cursor: pointer;
            border-bottom: 1px solid #eee;
            font-size: 0.92em;
        }

        .cg-dropdown-item:hover {
            background: #f0f0f0;
        }

        .cg-dropdown-item:last-child {
            border-bottom: none;
        }

        .campground-result-section {
            margin: 14px 0;
        }
    `;
    const style = document.createElement("style");
    style.type = "text/css";
    if (style.styleSheet) {
        style.styleSheet.cssText = STYLE_RULES;
    } else {
        style.appendChild(document.createTextNode(STYLE_RULES));
    }
    document.getElementsByTagName("head")[0].appendChild(style);

    // Creating title box
    const titleBox = document.createElement('div');
    titleBox.setAttribute("style", DEFAULT_TITLE_BOX_STYLE);
    const titleElement = document.createElement('h1');
    titleElement.setAttribute("style", "text-align: center; margin: 0 auto;");
    const subTitleElement = document.createElement('h4');
    const anchorTagHtml = `<a href="https://www.recreation.gov/search?inventory_type=camping" target="_blank">Recreation.gov</a>`;
    subTitleElement.innerHTML = `Use this tool to see all available dates for selected months for a given campground ID from ${anchorTagHtml}`;
    titleBox.appendChild(titleElement);
    titleBox.appendChild(subTitleElement);

    document.body.appendChild(titleBox);
    setTitle();
    titleElement.innerText = "Recreation.gov Campsite Availability";

    const availabilityTablesSection = document.createElement('div');

    function selectionCallback(selectionData) {
        const { campgrounds, year, months } = selectionData;
        availabilityTablesSection.innerText = "";
        setTitle(campgrounds.map(c => c.name || c.id).join(', '));

        campgrounds.forEach(({ id, name }) => {
            const section = createCampgroundResultSection(id, name, year, months);
            availabilityTablesSection.appendChild(section);
        });
    }
    const userInputSection = createUserInputSection(defaultCampground, selectionCallback);
    document.body.appendChild(userInputSection);
    document.body.appendChild(availabilityTablesSection);
}

function createCampgroundSearchWidget() {
    let selectedCampgrounds = [];
    let searchTimeout = null;

    const wrapper = document.createElement('div');
    wrapper.style.cssText = "position: relative; display: inline-block;";

    const tagsContainer = document.createElement('div');
    tagsContainer.style.cssText = "min-height: 28px; margin-bottom: 4px;";

    const searchInput = document.createElement('input');
    searchInput.type = 'text';
    searchInput.placeholder = 'Search campgrounds by name...';
    searchInput.style.cssText = "width: 320px; display: block;";

    const dropdown = document.createElement('div');
    dropdown.className = 'cg-dropdown';
    dropdown.style.display = 'none';

    function renderTags() {
        tagsContainer.innerText = '';
        selectedCampgrounds.forEach(cg => {
            const tag = document.createElement('span');
            tag.className = 'cg-tag';
            const nameSpan = document.createElement('span');
            nameSpan.innerText = cg.name;
            const removeBtn = document.createElement('button');
            removeBtn.innerText = '×';
            removeBtn.title = 'Remove';
            removeBtn.onclick = () => {
                selectedCampgrounds = selectedCampgrounds.filter(c => c.id !== cg.id);
                renderTags();
            };
            tag.appendChild(nameSpan);
            tag.appendChild(removeBtn);
            tagsContainer.appendChild(tag);
        });
    }

    function showResults(results) {
        dropdown.innerText = '';
        if (results.length === 0) {
            dropdown.style.display = 'none';
            return;
        }
        results.forEach(cg => {
            const item = document.createElement('div');
            item.className = 'cg-dropdown-item';
            const alreadySelected = selectedCampgrounds.find(c => c.id === cg.id);
            item.innerText = `${cg.name}${cg.location ? ' — ' + cg.location : ''} (ID: ${cg.id})`;
            if (alreadySelected) item.style.color = '#999';
            item.onclick = () => {
                if (!alreadySelected) {
                    selectedCampgrounds.push({ id: cg.id, name: cg.name });
                    renderTags();
                }
                searchInput.value = '';
                dropdown.style.display = 'none';
            };
            dropdown.appendChild(item);
        });
        dropdown.style.display = 'block';
    }

    searchInput.oninput = () => {
        clearTimeout(searchTimeout);
        const query = searchInput.value.trim();
        if (query.length < 2) {
            dropdown.style.display = 'none';
            return;
        }
        searchTimeout = setTimeout(() => {
            fetchCampgroundSearch(query)
                .then(r => r.json())
                .then(data => {
                    const raw = data.results || data.inventory_suggestions || data.suggest || [];
                    const results = raw
                        .filter(r => {
                            const type = (r.entity_type || r.type || '').toLowerCase();
                            return type === 'campground' || type === 'camping';
                        })
                        .slice(0, 12)
                        .map(r => ({
                            id: String(r.entity_id || r.id || ''),
                            name: r.name || r.entity_name || r.title || String(r.entity_id || r.id),
                            location: r.city ? `${r.city}, ${r.state_code || ''}` : ''
                        }))
                        .filter(r => r.id);
                    showResults(results);
                })
                .catch(err => console.log('Search error:', err));
        }, 300);
    };

    searchInput.onkeydown = (e) => {
        if (e.key === 'Escape') dropdown.style.display = 'none';
    };

    document.addEventListener('click', (e) => {
        if (!wrapper.contains(e.target)) dropdown.style.display = 'none';
    });

    wrapper.appendChild(tagsContainer);
    wrapper.appendChild(searchInput);
    wrapper.appendChild(dropdown);

    return {
        element: wrapper,
        getSelected: () => selectedCampgrounds
    };
}

function createCampgroundResultSection(campgroundID, campgroundLabel, year, months) {
    const section = document.createElement('div');
    section.className = 'campground-result-section';

    const headerBox = document.createElement('div');
    headerBox.setAttribute('style', DEFAULT_H2_BOX_STYLE);
    const header = document.createElement('h2');
    const link = document.createElement('a');
    const address = document.createElement('h4');
    const email = document.createElement('h5');
    const phone = document.createElement('h5');
    headerBox.appendChild(header);
    headerBox.appendChild(link);
    headerBox.appendChild(address);
    headerBox.appendChild(email);
    headerBox.appendChild(phone);

    const dataDiv = document.createElement('div');

    header.innerText = `Availability: Campground ${campgroundID}`;
    dataDiv.innerText = 'Loading...';

    section.appendChild(headerBox);
    section.appendChild(dataDiv);

    fetchCampground(campgroundID)
        .then(r => r.json())
        .then(({ campground: cg }) => {
            if (!cg) {
                header.innerText = `CAMPGROUND ${campgroundID} NOT FOUND`;
                dataDiv.innerText = '';
                return;
            }
            header.innerText = `Availability: ${cg.facility_name}`;
            link.href = campgroundWebsiteLink(campgroundID);
            link.innerText = 'Recreation.gov Page';
            link.target = '_blank';
            if (cg.addresses && cg.addresses.length > 0) {
                const { address1, city, state_code, postal_code } = cg.addresses[0];
                address.innerText = `${address1}, ${city}, ${state_code} ${postal_code}`;
            }
            if (cg.facility_email && cg.facility_email.length > 0) {
                email.innerText = `Email: ${cg.facility_email}`;
            }
            if (cg.facility_phone && cg.facility_phone.length > 0) {
                phone.innerText = `Phone: ${cg.facility_phone}`;
            }
        })
        .catch(err => console.log(err.message));

    fetchAvailabilityandAggregate(campgroundID, year, months, (aggregatedAvailability) => {
        const tables = createCampsitesAvailabilityTables(aggregatedAvailability);
        dataDiv.innerText = '';
        if (tables.length > 0) {
            tables.forEach(tbl => dataDiv.appendChild(tbl));
        } else {
            dataDiv.innerText = 'No availability found for these dates :(';
        }
    });

    return section;
}

function createUserInputSection(defaultCampground, selectionCallback) {
    const DEFAULT_BOX_MARGIN = "6px 0px";
    const defaultAvailabilityYear = (new Date()).getFullYear();

    const campgroundInputBox = document.createElement('div');
    campgroundInputBox.id = "campground-input-box";
    campgroundInputBox.style.margin = DEFAULT_BOX_MARGIN;
    campgroundInputBox.style.padding = "5px";
    const campgroundLabel = document.createElement('label');
    campgroundLabel.innerText = "Campgrounds";
    campgroundLabel.style.cssText = "font-weight: bold; display: block; margin-bottom: 4px;";
    const searchWidget = createCampgroundSearchWidget();
    campgroundInputBox.appendChild(campgroundLabel);
    campgroundInputBox.appendChild(searchWidget.element);

    const yearInputBox = document.createElement('div');
    yearInputBox.id = "year-input-box";
    yearInputBox.style.margin = DEFAULT_BOX_MARGIN;
    yearInputBox.style.padding = "5px";
    const yearLabel = document.createElement('label');
    yearLabel.innerText = "Year";
    yearLabel.style.fontWeight = "bold";
    const yearInput = document.createElement('input');
    yearInput.type = "number";
    yearInput.required = true;
    yearInput.value = defaultAvailabilityYear;
    yearInput.style.display = "block";
    yearInputBox.appendChild(yearLabel);
    yearInputBox.appendChild(yearInput);

    let selectedMonths = [];
    function clickCheckBox(e) {
        const { value, checked } = e.target;
        const selectedMonthsSet = new Set(selectedMonths);
        if (checked) {
            selectedMonthsSet.add(value);
        } else {
            selectedMonthsSet.delete(value);
        }
        selectedMonths = Array.from(selectedMonthsSet);
    }

    const monthsBox = document.createElement('div');
    monthsBox.id = "months-box";
    monthsBox.style.margin = DEFAULT_BOX_MARGIN;
    monthsBox.style.padding = "5px";
    const monthsLabel = document.createElement('label');
    monthsLabel.style.fontWeight = "bold";
    monthsLabel.innerText = "Months";
    const monthsRadioButtons = Object.keys(MONTHS_MAP).map(month => {
        const monthName = MONTHS_MAP[month];
        const cid = `checkbox-${monthName}`;
        const d = document.createElement('div');
        const checkBox = document.createElement('input');
        checkBox.type = "checkbox";
        checkBox.value = String(month);
        checkBox.id = cid;
        checkBox.name = cid;
        checkBox.onclick = clickCheckBox;
        const label = document.createElement('label');
        label.for = cid;
        label.innerText = monthName;
        label.style.margin = "auto 6px";
        d.appendChild(checkBox);
        d.appendChild(label);
        return d;
    });
    monthsBox.appendChild(monthsLabel);
    monthsRadioButtons.forEach(mrb => monthsBox.appendChild(mrb));

    function submit(e) {
        e.preventDefault();
        const campgrounds = searchWidget.getSelected();
        const availabilityYear = yearInput.value;
        if (campgrounds.length === 0) {
            return alert('Please search for and select at least one campground.');
        }
        if (selectedMonths.length === 0) {
            return alert('Need to select at least one month for availability.');
        }
        selectionCallback({ campgrounds, year: availabilityYear, months: selectedMonths });
    }

    const submitButton = document.createElement('button');
    submitButton.type = "button";
    submitButton.onclick = submit;
    submitButton.innerText = "Submit";

    const userInputSection = document.createElement('div');
    const header = document.createElement('h2');
    header.innerText = "Select Campground Availability";

    userInputSection.appendChild(header);
    userInputSection.appendChild(campgroundInputBox);
    userInputSection.appendChild(yearInputBox);
    userInputSection.appendChild(monthsBox);
    userInputSection.appendChild(submitButton);

    return userInputSection;
}

// MAIN
setUpUI(DEFAULT_CAMPGROUND);
