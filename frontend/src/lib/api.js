async function request(path, { method = "GET", token, body } = {}) {
  const response = await fetch(`http://localhost:5000/api${path}`, {
    method,
    headers: {
      ...(body ? { "content-type": "application/json" } : {}),
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(
      payload.error?.message || "The request could not be completed.",
    );
    error.code = payload.error?.code;
    error.status = response.status;
    throw error;
  }

  return payload;
}

export const api = {
  login: (body) => request("/auth/login", { method: "POST", body }),
  register: (body) => request("/auth/register", { method: "POST", body }),
  mentors: ({ search = "", subject = "" } = {}) => {
    const params = new URLSearchParams({ limit: "50" });
    if (search.trim()) params.set("search", search.trim());
    if (subject) params.set("subject", subject);
    return request(`/mentors?${params}`);
  },
  availability: (mentorId, date) =>
    request(
      `/mentors/${encodeURIComponent(mentorId)}/availability?date=${encodeURIComponent(date)}`,
    ),
  bookings: (token) => request("/bookings?limit=50", { token }),
  createBooking: (token, body) =>
    request("/bookings", { method: "POST", token, body }),
  cancelBooking: (token, bookingId) =>
    request(`/bookings/${encodeURIComponent(bookingId)}`, {
      method: "DELETE",
      token,
    }),
};
