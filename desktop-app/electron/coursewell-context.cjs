function sanitizeCoursewellContext(value) {
  if (!value || typeof value !== "object" || !Array.isArray(value.assignments)) {
    throw new Error("Invalid Coursewell context payload.");
  }
  const sharedAt = new Date(value.sharedAt);
  if (!Number.isFinite(sharedAt.getTime())) throw new Error("Invalid Coursewell share timestamp.");
  const assignments = value.assignments.slice(0, 20).map((item) => {
    if (!item || typeof item !== "object") throw new Error("Invalid assignment context.");
    const dueAt = new Date(item.dueAt);
    if (!Number.isFinite(dueAt.getTime()) || typeof item.title !== "string" || typeof item.course !== "string") {
      throw new Error("Invalid assignment context fields.");
    }
    return { title: item.title.slice(0, 160), course: item.course.slice(0, 100), dueAt: dueAt.toISOString() };
  });
  return { sharedAt: sharedAt.toISOString(), assignments };
}

module.exports = { sanitizeCoursewellContext };
