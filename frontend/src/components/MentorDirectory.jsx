import { Search, Users } from "lucide-react";
import { MentorCard } from "./MentorCard.jsx";
import { SubjectDropdown } from "./SubjectDropdown.jsx";
import { Loading } from "./Loading.jsx";
import { InlineError } from "./InlineError.jsx";

export function MentorDirectory({
  mentors,
  loading,
  error,
  search,
  subject,
  subjects,
  onSearchChange,
  onSubjectChange,
  onBook,
}) {
  return (
    <section className="directory-section" aria-labelledby="directory-heading">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Browse the directory</p>
          <h2 id="directory-heading">Meet your mentors</h2>
        </div>
        <span className="result-count">
          <Users size={16} /> {loading ? "…" : `${mentors.length} mentors`}
        </span>
      </div>
      <div className="directory-tools">
        <label className="search-field">
          <Search size={18} aria-hidden="true" />
          <span className="sr-only">Search mentors and subjects</span>
          <input
            placeholder="Search mentors or subjects"
            value={search}
            style={{ outline: "none" }}
            onChange={(event) => onSearchChange(event.target.value)}
          />
        </label>
        <SubjectDropdown
          value={subject}
          options={subjects}
          onChange={onSubjectChange}
        />
      </div>
      <InlineError>{error}</InlineError>
      {loading && mentors.length === 0 ? (
        <Loading label="Finding mentors" />
      ) : null}
      {!loading && !error && mentors.length === 0 ? (
        <div className="empty-state directory-empty">
          <span className="empty-icon">
            <Search size={21} />
          </span>
          <h3>No mentors match that search</h3>
          <p>Try another name or clear the subject filter.</p>
        </div>
      ) : null}
      {mentors.length > 0 ? (
        <div className={`mentor-grid ${loading ? "grid-loading" : ""}`}>
          {mentors.map((mentor) => (
            <MentorCard key={mentor._id} mentor={mentor} onBook={onBook} />
          ))}
        </div>
      ) : null}
    </section>
  );
}
