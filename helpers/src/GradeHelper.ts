// Shared grade ordering so kiosk eligibility, admin previews, and the server
// promotion job all compare grades against one canonical list.
export const GRADES = [
  "PreK", "K", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12", "Graduated"
];

export class GradeHelper {
  static getIndex(grade: string | null | undefined): number {
    if (!grade) return -1;
    return GRADES.indexOf(grade);
  }

  static nextGrade(grade: string | null | undefined): string | null {
    const idx = GradeHelper.getIndex(grade);
    if (idx === -1 || idx >= GRADES.length - 1) return null;
    return GRADES[idx + 1];
  }
}
