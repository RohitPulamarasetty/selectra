export const demoApplications = [
  {
    id: "SEL-0001", name: "Ananya Rao", location: "Pune, Maharashtra",
    education: "B.Sc. Statistics, Year 2", academic: 91.4,
    subjects: ["Probability", "Linear algebra", "Economics"], skills: ["R", "Excel", "ggplot2"],
    motivation: "I want to get better at explaining uncertainty to people who have to make a decision. I saw how easily a single average hid the longest waits in a bus survey I ran with classmates.",
    statement: "I collected 246 bus arrival observations at three stops. The data I first collected overrepresented my morning commute, so I added afternoon visits and reported results separately for each stop.",
    projects: "Compared scheduled and observed headways using median and 90th-percentile delays. The report includes a sampling plan and a reproducible R notebook.",
    extracurricular: "Runs weekly study sessions for the statistics club.",
    notes: "Available after 4 p.m. on weekdays.",
    eligibility: "eligible", eligibility_reason: "Required academic and application evidence is complete.",
  },
  {
    id: "SEL-0002", name: "Dev Patel", location: "Ahmedabad, Gujarat",
    education: "Diploma in Information Technology", academic: 84.8,
    subjects: ["Database systems", "Discrete mathematics", "Networking"], skills: ["Python", "SQLite", "Git"],
    motivation: "I can build small tools, but I want to understand the statistics behind the numbers they display. I would like to improve how I validate results before sharing them with others.",
    statement: "The school library lending sheet mixed nicknames and full names. I first tried fuzzy matching, then switched to library card numbers after finding that two readers were being merged.",
    projects: "Built an offline checkout tool with a CSV import preview and validation for duplicate library card numbers.",
    extracurricular: "Volunteers to repair and reimage computers for a neighbourhood learning centre.",
    notes: "Project was built independently, with a librarian testing the checkout workflow.",
    eligibility: "eligible", eligibility_reason: "Diploma transcript and declaration are available.",
  },
  {
    id: "SEL-0003", name: "Meera Nair", location: "Kochi, Kerala",
    education: "B.Com. with Business Analytics, Year 1", academic: 88.2,
    subjects: ["Business statistics", "Accounting", "Microeconomics"], skills: ["Excel", "SQL", "Power BI"],
    motivation: "I want to learn to separate a pattern that matters from ordinary variation. A shop inventory exercise helped me see how monthly totals can hide days when popular items sell out.",
    statement: "I compared daily sales for a student-run shop. After noticing that some blank rows were closure days, I separated the closures from missing records before recalculating the stock-out rate.",
    projects: "Created a small inventory dashboard and documented where missing records could change the conclusions.",
    extracurricular: "Treasurer for a campus book exchange.",
    notes: "",
    eligibility: "eligible", eligibility_reason: "Academic result and written responses meet screening requirements.",
  },
  {
    id: "SEL-0004", name: "Tenzin Dorjee", location: "Dharamshala, Himachal Pradesh",
    education: "Higher Secondary Certificate, Science", academic: 81.6,
    subjects: ["Mathematics", "Physics", "Computer science"], skills: ["Python", "pandas", "QGIS"],
    motivation: "I would like to learn how to test assumptions before presenting a forecast. My first attempt at measuring rainfall taught me how much a single poorly maintained sensor can change a chart.",
    statement: "I placed two low-cost rain gauges in different parts of the school grounds. When the readings diverged, I checked the mounting and marked the days when one gauge was partially obstructed.",
    projects: "Published a two-week rainfall log with a field diagram, two missing observations, and notes on likely measurement error.",
    extracurricular: "Coordinates the school nature club's weekend field notes.",
    notes: "",
    eligibility: "eligible", eligibility_reason: "Academic and supporting evidence are complete.",
  },
  {
    id: "SEL-0005", name: "Zoya Khan", location: "Hyderabad, Telangana",
    education: "B.A. Economics, Year 2", academic: 86.7,
    subjects: ["Econometrics", "Economics", "Mathematics"], skills: ["Python", "pandas", "Excel"],
    motivation: "I want to use survey data responsibly. In a student project about commuting costs, the people with the longest journeys were the least likely to stay after class to answer our survey.",
    statement: "I compared our classroom sample with an online follow-up. The convenience sample was easier to collect, but I reported the difference between them before suggesting any change.",
    projects: "Wrote a survey summary with separate weekday and weekend travel figures and a short discussion of nonresponse bias.",
    extracurricular: "Helps run orientation for commuting students.",
    notes: "",
    eligibility: "eligible", eligibility_reason: "Academic record, subject background, and declaration are available.",
  },
  {
    id: "SEL-0006", name: "Arjun Menon", location: "Coimbatore, Tamil Nadu",
    education: "B.E. Mechanical Engineering, Year 1", academic: 83.1,
    subjects: ["Calculus", "Physics", "Programming fundamentals"], skills: ["Python", "Arduino", "Spreadsheets"],
    motivation: "I am applying because I want to turn measurements from devices into findings someone else can reproduce. My current engineering labs give me plenty of readings with little guidance on analysis.",
    statement: "A vibration sensor produced spikes when our workbench moved. I collected a separate stationary series and used it to identify which peaks were probably unrelated to the motor.",
    projects: "Logged vibration readings on a small motor and compared repeated runs under two mounting conditions.",
    extracurricular: "Member of the campus makerspace.",
    notes: "",
    eligibility: "not_screened", eligibility_reason: "Application received. Screening has not started.",
  },
  {
    id: "SEL-0007", name: "Ishan Kulkarni", location: "Nagpur, Maharashtra",
    education: "Diploma in Electronics", academic: 82,
    subjects: ["Digital electronics", "Applied mathematics", "Programming"], skills: ["Python", "Arduino"],
    motivation: "I am interested in analysing sensor data reliably. I would like to learn how to decide when variation is measurement noise and when it reflects something meaningful.",
    statement: "I built a monitor for the electronics lab. When two thermistors disagreed, I compared them with a reference thermometer at four temperatures and recorded the calibration error.",
    projects: "Built a temperature logger and included calibration measurements alongside the recorded data.",
    extracurricular: "Maintains the electronics club's equipment sign-out log.",
    notes: "The transcript contains results from multiple terms.",
    eligibility: "clarification", eligibility_reason: "Confirm which terms the reported aggregate covers.",
  },
  {
    id: "SEL-0008", name: "Farah Siddiqui", location: "Lucknow, Uttar Pradesh",
    education: "Higher Secondary Certificate, Humanities", academic: null,
    subjects: ["Geography", "Economics", "English"], skills: ["Excel", "QGIS"],
    motivation: "I use maps and spreadsheets in geography and want to build a stronger quantitative foundation for working with neighbourhood services data.",
    statement: "For a school assignment I compared walks to nearby health centres, taking a second route where construction made the shortest path impractical.",
    projects: "Mapped walking routes to three public clinics.",
    extracurricular: "Volunteer note-taker for a school accessibility survey.",
    notes: "Academic result was unavailable when screening closed.",
    declaration: false,
    eligibility: "ineligible", eligibility_reason: "The required academic result and signed declaration were missing at the screening deadline.",
  },
];

const panelRatings = [
  [[5, 5, 5, 4, 4], [5, 4, 5, 4, 5], [4, 5, 5, 4, 5], [5, 4, 4, 4, 4], [5, 5, 5, 5, 4]],
  [[4, 4, 4, 5, 4], [4, 4, 5, 5, 4], [4, 3, 4, 4, 4], [4, 3, 4, 4, 3], [4, 4, 5, 5, 5]],
  [[4, 4, 4, 4, 5], [4, 4, 4, 4, 5], [4, 5, 5, 4, 4], [3, 4, 4, 3, 4], [4, 4, 4, 4, 5]],
  [[4, 4, 4, 4, 3], [3, 4, 4, 5, 3], [4, 4, 4, 4, 4], [3, 3, 4, 3, 3], [4, 4, 4, 5, 4]],
  [[4, null, 4, null, null], [4, 4, 4, 4, 4], [4, 5, 4, 4, 4], [4, 4, 4, 3, 4], [4, 5, 4, 4, 5]],
];
const feedback = [
  "A clear sampling correction and a sensible use of percentiles. Ask how the weekend schedule would affect the comparison.",
  "The applicant explains why IDs beat fuzzy matching. A short test report for imports would strengthen the project evidence.",
  "Correctly separates closure days from missing data. Ask whether the same definitions work for periods with irregular opening hours.",
  "Good field notes and an honest treatment of sensor error. A longer observation window would make the comparison more reliable.",
  "Identifies a plausible source of nonresponse bias and compares two samples. More detail on sample sizes would improve the conclusion.",
];
const reviewerNotes = [
  "The reasoning connects the evidence to the conclusion.",
  "Consider asking for an example of how the work was validated.",
  "The reflection gives the panel a useful starting point for an interview.",
  "I would ask the applicant to show the original records during an interview.",
  "The submission is clear about what the applicant contributed.",
];

export function reviewRows(panel, weights, startTime) {
  return panelRatings.flatMap((applicantRatings, applicantIndex) => applicantRatings.map((ratings, index) => {
    const submitted = !ratings.includes(null);
    const timestamp = new Date(startTime + applicantIndex * 86400_000 + index * 5400_000).toISOString();
    return {
      application_id: demoApplications[applicantIndex].id,
      evaluator_id: panel[index].id,
      status: submitted ? "submitted" : "draft",
      ratings,
      comments: ["", "", reviewerNotes[index], "", ""],
      feedback: submitted ? feedback[applicantIndex] : "Initial notes on survey sampling. The evidence and final rating still need review.",
      raw_score: submitted ? ratings.reduce((total, rating, criterion) => total + rating * weights[criterion] / 5, 0) : null,
      version: 1,
      seeded: true,
      updated_at: timestamp,
      submitted_at: submitted ? timestamp : null,
    };
  }));
}
