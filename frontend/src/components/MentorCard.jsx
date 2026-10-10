import { useState } from "react";
import { ArrowRight, Clock3 } from "lucide-react";
import { MENTOR_PORTRAITS } from "../constants/mentors.js";
import { availabilitySummary } from "../lib/mentorUtils.js";

export function MentorCard({ mentor, onBook, publicPreview = false }) {
  const [portraitUnavailable, setPortraitUnavailable] = useState(false);
  const portrait = portraitUnavailable ? null : MENTOR_PORTRAITS[mentor.name];

  return (
    <article className="mentor-card">
      <div className="mentor-card-top">
        {portrait ? (
          <img
            className="avatar avatar-mentor mentor-portrait"
            src={portrait}
            alt={`Portrait of ${mentor.name}`}
            width="40"
            height="40"
            loading="lazy"
            decoding="async"
            onError={() => setPortraitUnavailable(true)}
          />
        ) : (
          <div className="avatar avatar-mentor" aria-hidden="true">
            {mentor.name
              .split(" ")
              .map((part) => part[0])
              .slice(0, 2)
              .join("")}
          </div>
        )}
        <span className="mentor-active-label">
          <span className="availability-dot" /> Accepting trials
        </span>
      </div>
      <h3>{mentor.name}</h3>
      <p className="mentor-bio">{mentor.bio}</p>
      <div className="subject-list">
        {mentor.subjects.map((subject) => (
          <span className="subject-tag" key={subject}>
            {subject}
          </span>
        ))}
      </div>
      <div className="mentor-card-bottom">
        <span className="availability-hint" title={`${mentor.timezone} time`}>
          <Clock3 size={15} /> {availabilitySummary(mentor)}
        </span>
        <button
          className="button button-outline button-small"
          onClick={() => onBook(mentor)}
        >
          {publicPreview ? "Book a trial" : "View times"}{" "}
          <ArrowRight size={15} />
        </button>
      </div>
    </article>
  );
}
