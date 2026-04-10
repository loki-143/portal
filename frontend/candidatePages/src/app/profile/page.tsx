"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { api, getAuthSession } from "@/lib/api-client";
import { toast } from "@/lib/toast";
import type { CandidateProfile } from "@/types";

export default function ProfileSettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<CandidateProfile | null>(null);
  
  // Form fields
  const [headline, setHeadline] = useState("");
  const [location, setLocation] = useState("");
  const [bio, setBio] = useState("");
  const [skills, setSkills] = useState<string[]>([]);
  const [skillInput, setSkillInput] = useState("");
  const [experienceYears, setExperienceYears] = useState(0);

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    try {
      setLoading(true);
      const data = await api.profile.get();
      setProfile(data);
      
      // Populate form fields
      setHeadline(data.headline || "");
      setLocation(data.location || "");
      setBio(data.bio || "");
      setSkills(data.skills || []);
      setExperienceYears(data.experience_years || 0);
    } catch (err) {
      console.error("Failed to load profile:", err);
      toast.error("Failed to load profile", "Please try again later.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    
    try {
      setSaving(true);
      await api.profile.update({
        headline: headline.trim() || undefined,
        location: location.trim() || undefined,
        bio: bio.trim() || undefined,
        skills,
        experience_years: experienceYears,
      });
      
      toast.success("Profile updated", "Your changes have been saved.");
      router.push("/dashboard/candidate");
    } catch (err) {
      console.error("Failed to save profile:", err);
      toast.error("Failed to save", "Please try again later.");
    } finally {
      setSaving(false);
    }
  }

  function handleAddSkill() {
    const skill = skillInput.trim();
    if (skill && !skills.includes(skill)) {
      setSkills([...skills, skill]);
      setSkillInput("");
    }
  }

  function handleRemoveSkill(skillToRemove: string) {
    setSkills(skills.filter(s => s !== skillToRemove));
  }

  const session = getAuthSession();
  const userEmail = session?.user?.email || "";
  const userName = session?.user ? `${session.user.first_name || ''} ${session.user.last_name || ''}`.trim() : "User";

  return (
    <>
      <Header />
      <main className="max-w-4xl mx-auto px-6 py-10">
        <div className="mb-8">
          <h1 className="font-headline text-3xl font-bold text-on-surface mb-2">
            Profile Settings
          </h1>
          <p className="text-on-surface-variant">
            Update your profile information and preferences
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <p className="text-on-surface-variant">Loading profile...</p>
          </div>
        ) : (
          <form onSubmit={handleSave} className="space-y-8">
            {/* User Info (Read-only) */}
            <div className="bg-surface-container-low rounded-2xl p-6">
              <h2 className="font-headline text-xl font-bold text-on-surface mb-4">
                Account Information
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-outline block mb-2">
                    Name
                  </label>
                  <p className="text-on-surface">{userName || "Not set"}</p>
                </div>
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-outline block mb-2">
                    Email
                  </label>
                  <p className="text-on-surface">{userEmail}</p>
                </div>
              </div>
            </div>

            {/* Profile Details */}
            <div className="bg-surface-container-low rounded-2xl p-6">
              <h2 className="font-headline text-xl font-bold text-on-surface mb-4">
                Profile Details
              </h2>
              <div className="space-y-6">
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-outline block mb-2">
                    Professional Headline
                  </label>
                  <input
                    type="text"
                    value={headline}
                    onChange={(e) => setHeadline(e.target.value)}
                    placeholder="e.g., Full Stack Developer | React & Node.js"
                    className="w-full px-4 py-3 rounded-lg border border-outline-variant bg-surface focus:ring-2 focus:ring-primary focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-outline block mb-2">
                    Location
                  </label>
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="e.g., San Francisco, CA"
                    className="w-full px-4 py-3 rounded-lg border border-outline-variant bg-surface focus:ring-2 focus:ring-primary focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-outline block mb-2">
                    Bio
                  </label>
                  <textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="Tell us about yourself..."
                    rows={4}
                    className="w-full px-4 py-3 rounded-lg border border-outline-variant bg-surface focus:ring-2 focus:ring-primary focus:outline-none resize-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-outline block mb-2">
                    Years of Experience
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="50"
                    value={experienceYears}
                    onChange={(e) => setExperienceYears(parseInt(e.target.value) || 0)}
                    className="w-full px-4 py-3 rounded-lg border border-outline-variant bg-surface focus:ring-2 focus:ring-primary focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-outline block mb-2">
                    Skills
                  </label>
                  <div className="flex gap-2 mb-3">
                    <input
                      type="text"
                      value={skillInput}
                      onChange={(e) => setSkillInput(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddSkill();
                        }
                      }}
                      placeholder="Add a skill..."
                      className="flex-1 px-4 py-3 rounded-lg border border-outline-variant bg-surface focus:ring-2 focus:ring-primary focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={handleAddSkill}
                      className="px-6 py-3 bg-primary text-on-primary font-bold rounded-lg hover:bg-primary/90 transition-colors"
                    >
                      Add
                    </button>
                  </div>
                  
                  {skills.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {skills.map((skill) => (
                        <span
                          key={skill}
                          className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary/10 text-primary text-sm font-bold rounded-full"
                        >
                          {skill}
                          <button
                            type="button"
                            onClick={() => handleRemoveSkill(skill)}
                            className="hover:text-error transition-colors"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-4">
              <button
                type="submit"
                disabled={saving}
                className="px-8 py-3 bg-primary text-on-primary font-bold rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>
              <button
                type="button"
                onClick={() => router.push("/dashboard/candidate")}
                className="px-8 py-3 border border-outline-variant text-on-surface font-bold rounded-lg hover:bg-surface-container-low transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </main>
      <Footer />
    </>
  );
}
