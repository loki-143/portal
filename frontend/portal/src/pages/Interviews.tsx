import { useState, useEffect } from "react";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Calendar, Clock, Video, Phone, MapPin, Star, X, Check, MessageSquare } from "lucide-react";
import { interviewsApi, applicationsApi } from "../services/api";
import type { Interview, InterviewType, InterviewStatus, Application } from "../types";

type View = "list" | "schedule" | "feedback";

export default function Interviews() {
  const [view, setView] = useState<View>("list");
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedInterview, setSelectedInterview] = useState<Interview | null>(null);
  const [selectedApplication, setSelectedApplication] = useState<Application | null>(null);

  // Form state for scheduling
  const [scheduledAt, setScheduledAt] = useState("");
  const [interviewType, setInterviewType] = useState<InterviewType>("video");
  const [meetingLink, setMeetingLink] = useState("");
  const [interviewerName, setInterviewerName] = useState("");
  const [notesForCandidate, setNotesForCandidate] = useState("");
  const [applicationId, setApplicationId] = useState("");

  // Feedback form state
  const [feedback, setFeedback] = useState("");
  const [rating, setRating] = useState(0);
  const [status, setStatus] = useState<InterviewStatus>("completed");

  useEffect(() => {
    if (view === "list") {
      loadInterviews();
    }
  }, [view]);

  async function loadInterviews() {
    try {
      setLoading(true);
      setError(null);
      const response = await interviewsApi.list();
      setInterviews(response.interviews);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function handleScheduleInterview(e: React.FormEvent) {
    e.preventDefault();

    if (!applicationId || !scheduledAt) {
      setError("Application and date are required");
      return;
    }

    try {
      await interviewsApi.create({
        application_id: applicationId,
        scheduled_at: new Date(scheduledAt).toISOString(),
        interview_type: interviewType,
        meeting_link: meetingLink || undefined,
        interviewer_name: interviewerName || undefined,
        notes_for_candidate: notesForCandidate || undefined,
      });

      // Reset form
      setApplicationId("");
      setScheduledAt("");
      setInterviewType("video");
      setMeetingLink("");
      setInterviewerName("");
      setNotesForCandidate("");
      setView("list");
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function handleSaveFeedback() {
    if (!selectedInterview) return;

    try {
      await interviewsApi.update(selectedInterview.id, {
        feedback,
        rating: rating || undefined,
        status,
      });

      setView("list");
      setSelectedInterview(null);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  const upcoming = interviews.filter(i => i.status === "scheduled");
  const completed = interviews.filter(i => i.status === "completed");

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="space-y-2">
          <h1 className="display-md">Interviews</h1>
          <p className="text-on-surface-variant font-medium">Schedule and manage candidate interviews.</p>
        </div>
        <Button onClick={() => setView("schedule")}>
          <Calendar className="w-4 h-4 mr-2" />
          Schedule Interview
        </Button>
      </header>

      {error && (
        <Card variant="low" className="text-error">
          {error}
          <button onClick={() => setError(null)} className="ml-4 underline text-sm">Dismiss</button>
        </Card>
      )}

      {/* Schedule Form */}
      {view === "schedule" && (
        <Card className="space-y-8">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold">Schedule New Interview</h2>
            <Button variant="ghost" size="sm" onClick={() => setView("list")}>
              <X className="w-4 h-4" />
            </Button>
          </div>

          <form onSubmit={handleScheduleInterview} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2 space-y-2">
                <label className="label-md text-[10px] text-on-surface-variant/50">Application ID *</label>
                <input
                  type="text"
                  value={applicationId}
                  onChange={(e) => setApplicationId(e.target.value)}
                  placeholder="Enter application ID"
                  className="w-full bg-surface-container-low border-none rounded-lg px-4 py-3 focus:ring-2 focus:ring-primary/20"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="label-md text-[10px] text-on-surface-variant/50">Date & Time *</label>
                <input
                  type="datetime-local"
                  value={scheduledAt}
                  onChange={(e) => setScheduledAt(e.target.value)}
                  className="w-full bg-surface-container-low border-none rounded-lg px-4 py-3 focus:ring-2 focus:ring-primary/20"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="label-md text-[10px] text-on-surface-variant/50">Interview Type *</label>
                <div className="flex gap-2">
                  {(["phone", "video", "onsite"] as InterviewType[]).map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setInterviewType(type)}
                      className={`flex-1 py-3 rounded-lg font-bold text-sm transition-colors flex items-center justify-center gap-2 ${
                        interviewType === type
                          ? "bg-primary text-on-primary"
                          : "bg-surface-container-low text-on-surface-variant/60 hover:bg-surface-container-high"
                      }`}
                    >
                      {type === "phone" && <Phone className="w-4 h-4" />}
                      {type === "video" && <Video className="w-4 h-4" />}
                      {type === "onsite" && <MapPin className="w-4 h-4" />}
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              {interviewType === "video" && (
                <div className="md:col-span-2 space-y-2">
                  <label className="label-md text-[10px] text-on-surface-variant/50">Meeting Link</label>
                  <input
                    type="url"
                    value={meetingLink}
                    onChange={(e) => setMeetingLink(e.target.value)}
                    placeholder="https://meet.google.com/..."
                    className="w-full bg-surface-container-low border-none rounded-lg px-4 py-3 focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              )}

              <div className="space-y-2">
                <label className="label-md text-[10px] text-on-surface-variant/50">Interviewer Name</label>
                <input
                  type="text"
                  value={interviewerName}
                  onChange={(e) => setInterviewerName(e.target.value)}
                  placeholder="John Doe"
                  className="w-full bg-surface-container-low border-none rounded-lg px-4 py-3 focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div className="md:col-span-2 space-y-2">
                <label className="label-md text-[10px] text-on-surface-variant/50">Notes for Candidate</label>
                <textarea
                  value={notesForCandidate}
                  onChange={(e) => setNotesForCandidate(e.target.value)}
                  placeholder="Any special instructions or preparation needed..."
                  rows={3}
                  className="w-full bg-surface-container-low border-none rounded-lg px-4 py-3 focus:ring-2 focus:ring-primary/20 resize-none"
                />
              </div>
            </div>

            <div className="flex gap-4 pt-4">
              <Button type="submit">
                <Calendar className="w-4 h-4 mr-2" />
                Schedule Interview
              </Button>
              <Button variant="ghost" type="button" onClick={() => setView("list")}>
                Cancel
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Feedback Form */}
      {view === "feedback" && selectedInterview && (
        <Card className="space-y-8">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold">Interview Feedback</h2>
            <Button variant="ghost" size="sm" onClick={() => { setView("list"); setSelectedInterview(null); }}>
              <X className="w-4 h-4" />
            </Button>
          </div>

          <div className="space-y-6">
            <div className="bg-surface-container-low rounded-lg p-4">
              <p className="text-sm text-on-surface-variant/50 mb-1">Application ID</p>
              <p className="font-mono text-sm">{selectedInterview.application_id}</p>
              <p className="text-sm text-on-surface-variant/50 mt-3 mb-1">Scheduled</p>
              <p className="text-sm">{new Date(selectedInterview.scheduled_at).toLocaleString()}</p>
              <p className="text-sm text-on-surface-variant/50 mt-3 mb-1">Type</p>
              <p className="text-sm capitalize">{selectedInterview.interview_type}</p>
            </div>

            <div className="space-y-3">
              <label className="label-md text-[10px] text-on-surface-variant/50">Status</label>
              <div className="flex gap-2">
                {(["completed", "cancelled"] as InterviewStatus[]).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setStatus(s)}
                    className={`flex-1 py-3 rounded-lg font-bold text-sm transition-colors flex items-center justify-center gap-2 ${
                      status === s
                        ? s === "completed" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                        : "bg-surface-container-low text-on-surface-variant/60"
                    }`}
                  >
                    {s === "completed" && <Check className="w-4 h-4" />}
                    {s === "cancelled" && <X className="w-4 h-4" />}
                    {s.charAt(0).toUpperCase() + s.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <label className="label-md text-[10px] text-on-surface-variant/50">Rating (1-5)</label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    className="transition-colors"
                  >
                    <Star
                      className={`w-8 h-8 ${
                        star <= rating ? "text-yellow-400 fill-yellow-400" : "text-on-surface-variant/20"
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="label-md text-[10px] text-on-surface-variant/50">Feedback</label>
              <textarea
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder="Write your interview feedback here..."
                rows={6}
                className="w-full bg-surface-container-low border-none rounded-lg px-4 py-3 focus:ring-2 focus:ring-primary/20 resize-none"
              />
            </div>

            <div className="flex gap-4 pt-4">
              <Button onClick={handleSaveFeedback}>
                <Check className="w-4 h-4 mr-2" />
                Save Feedback
              </Button>
              <Button variant="ghost" onClick={() => { setView("list"); setSelectedInterview(null); }}>
                Cancel
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Interview List */}
      {view === "list" && (
        <>
          {/* Upcoming */}
          <div className="space-y-4">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <Clock className="w-5 h-5 text-primary" />
              Upcoming Interviews ({upcoming.length})
            </h2>

            {upcoming.length === 0 ? (
              <Card variant="low" className="text-center py-8">
                <Calendar className="w-12 h-12 mx-auto mb-4 text-on-surface-variant/30" />
                <p className="text-on-surface-variant">No upcoming interviews scheduled.</p>
              </Card>
            ) : (
              <div className="space-y-4">
                {upcoming.map((interview) => (
                  <Card key={interview.id} className="hover:bg-surface-container-low/50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                          {interview.interview_type === "phone" && <Phone className="w-5 h-5 text-primary" />}
                          {interview.interview_type === "video" && <Video className="w-5 h-5 text-primary" />}
                          {interview.interview_type === "onsite" && <MapPin className="w-5 h-5 text-primary" />}
                        </div>
                        <div>
                          <p className="font-bold">{interview.interview_type.charAt(0).toUpperCase() + interview.interview_type.slice(1)} Interview</p>
                          <p className="text-sm text-on-surface-variant/70">
                            {new Date(interview.scheduled_at).toLocaleString()}
                          </p>
                          {interview.interviewer_name && (
                            <p className="text-xs text-on-surface-variant/50">with {interview.interviewer_name}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {interview.meeting_link && (
                          <a
                            href={interview.meeting_link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-primary hover:underline"
                          >
                            Join Meeting
                          </a>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedInterview(interview);
                            setView("feedback");
                          }}
                        >
                          <MessageSquare className="w-4 h-4" />
                          Feedback
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Completed */}
          <div className="space-y-4">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <Check className="w-5 h-5 text-green-600" />
              Completed Interviews ({completed.length})
            </h2>

            {completed.length === 0 ? (
              <Card variant="low" className="text-center py-8">
                <p className="text-on-surface-variant">No completed interviews yet.</p>
              </Card>
            ) : (
              <div className="space-y-4">
                {completed.map((interview) => (
                  <Card key={interview.id}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                          <Check className="w-5 h-5 text-green-600" />
                        </div>
                        <div>
                          <p className="font-bold">{interview.interview_type.charAt(0).toUpperCase() + interview.interview_type.slice(1)} Interview</p>
                          <p className="text-sm text-on-surface-variant/70">
                            Completed: {new Date(interview.updated_at).toLocaleString()}
                          </p>
                          {interview.rating && (
                            <div className="flex items-center gap-1 mt-1">
                              {[1, 2, 3, 4, 5].map(star => (
                                <Star
                                  key={star}
                                  className={`w-3 h-3 ${star <= interview.rating! ? "text-yellow-400 fill-yellow-400" : "text-on-surface-variant/20"}`}
                                />
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                      {interview.feedback && (
                        <div className="max-w-xs">
                          <p className="text-sm text-on-surface-variant/70 line-clamp-2">{interview.feedback}</p>
                        </div>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
