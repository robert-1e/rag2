// TODO Finish these
type Subject = "Maths" | "Further_Maths" | "Biology" | "Chemistry" | "Physics" | "Computer_Science";
type ExamBoard = "OCR" | "OCR_MEI" | "AQA";

type ConfidenceLevel = null | 0 | 1 | 2 | 3 | 4;

type SpecID = {
    subject: Subject;
    board: ExamBoard;
};
type Spec = {
    id: SpecID;
    components: {
        name: string;
        items: {
            name: string;
            items: {
                name: string;
                points: string[];
            }[];
        }[];
    }[];
};

type Rag = {
    // TODO?: maybe make the version a different thing
    version: number;
    name: string;
    spec: SpecID;
    // The marks map to the spec, so for instance:
    /*
    (Rag).marks[3][11][9][13]
       maps to
    (Spec).components[3].items[11].items[9].points[13]
    */
    marks: ConfidenceLevel[][][][];
    lastModified: Date;
};
