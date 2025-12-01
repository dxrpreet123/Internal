
import { GradingSchema, ExamWeight } from "../types";

export const GRADING_PRESETS: { [key: string]: GradingSchema } = {
    'US_STD': { id: 'US_STD', name: 'US Standard (4.0 GPA)', type: 'GPA_4', maxScore: 4.0 },
    'PERCENT': { id: 'PERCENT', name: 'Percentage (0-100)', type: 'PERCENTAGE', maxScore: 100 },
    'UK_HON': { id: 'UK_HON', name: 'UK Honours (1st, 2:1...)', type: 'PERCENTAGE', maxScore: 100 },
    'IN_CGPA': { id: 'IN_CGPA', name: 'Indian CGPA (10.0)', type: 'GPA_10', maxScore: 10.0 },
    'GER_STD': { id: 'GER_STD', name: 'German (1.0-6.0)', type: 'GPA_5', maxScore: 1.0 }, // Inverted
};

export const EXAM_STRUCTURE_PRESETS: { [key: string]: ExamWeight[] } = {
    'STANDARD': [
        { name: 'Midterm', weight: 30 },
        { name: 'Final Exam', weight: 40 },
        { name: 'Assignments', weight: 30 }
    ],
    'HEAVY_FINAL': [
        { name: 'Midterm', weight: 20 },
        { name: 'Final Exam', weight: 60 },
        { name: 'Internals', weight: 20 }
    ],
    'CONTINUOUS': [
        { name: 'Quiz 1', weight: 10 },
        { name: 'Quiz 2', weight: 10 },
        { name: 'Midterm', weight: 25 },
        { name: 'Project', weight: 20 },
        { name: 'Final', weight: 35 }
    ]
};
