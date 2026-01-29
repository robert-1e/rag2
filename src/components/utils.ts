export async function _try(func: Function) {
    try {
        return func.constructor.name === "AsyncFunction" ? await func() : func();
    } catch (_) {
        return null;
    }
}

export let html = (s: string) => new DOMParser().parseFromString(s, "text/html").body.firstChild;

function mapMarks(specItems, marks) {
    let marksIndex = 0;
    const result = [];

    function recurse(items) {
        const mappedItems = [];
        for (const item of items) {
            if (Array.isArray(item.points)) {
                const itemCount = item.items.length;
                const subMarks = marks.slice(marksIndex, marksIndex + itemCount);
                marksIndex += itemCount;
                mappedItems.push(subMarks);
            } else {
                mappedItems.push(recurse(item.items));
            }
        }
        return mappedItems;
    }

    return recurse(specItems);
}

// latest (v1)
({
    name: {
        version: 1,
        spec: "cs-ocr",
        marks: [],
        lastModified: 0x0,
    },
});

export const versionHandlers = {
    // 0 is for .cms files
    0: {
        validate(obj: any) {
            return (
                typeof obj.student === "string" &&
                Array.isArray(obj.marks) &&
                // if theres at least 1 thing in the array with the right type its good enough
                obj.marks.reduce((acc: boolean, v: number) => acc || [0, 1, 2, 3].includes(v), false)
            );
        },
        toHTML(obj) {
            // not proper, probably never will be
            let e = html`<div id="${obj.student}">${JSON.stringify(obj)}</div>`;

            return e;
        },
        update(obj) {
            // currently updates to version 1
            return {
                version: 1,
                spec: "cs-ocr",
                marks: mapMarks(
                    specs["cs-ocr"],
                    // the .map fixes any errors with it, not that there should ever be any
                    obj.marks.map((v) => ([1, 2, 3].includes(v) ? v : 0))
                ),
                lastModified: Date.now(),
            };
        },
    },

    // start of my versions
    // version only changes when something changes (adding an extra attribute doesn't make them incompatible)
    1: {
        validate(obj) {},
        toHTML(obj) {
            let e = html`<div id="${obj.student}">${1}</div>`;

            return e;
        },
        update(obj) {
            // currently updates to version 1
            return obj;
        },
    },
    // __: {
    //     validate(obj) {},
    //     toHTML(obj) {},
    //     update(obj) {
    //         // currently updates to version _
    //     },
    // },
};

