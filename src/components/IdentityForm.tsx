import { type FormEvent, useEffect, useState } from "react";
import { User } from "lucide-react";

interface IdentityFormProps {
  onSave: (data: { displayName: string; username: string; socialLink: string; keywords: string }) => Promise<string | null> | string | null;
  initial?: { displayName: string; username: string; socialLink: string; keywords: string } | null;
}

const IdentityForm = ({ onSave, initial }: IdentityFormProps) => {
  const [displayName, setDisplayName] = useState(initial?.displayName || "");
  const [username, setUsername] = useState(initial?.username || "");
  const [socialLink, setSocialLink] = useState(initial?.socialLink || "");
  const [keywords, setKeywords] = useState(initial?.keywords || "");
  const [saved, setSaved] = useState(!!initial);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    setDisplayName(initial?.displayName || "");
    setUsername(initial?.username || "");
    setSocialLink(initial?.socialLink || "");
    setKeywords(initial?.keywords || "");
    setSaved(Boolean(initial));
  }, [initial]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    const result = await onSave({ displayName, username, socialLink, keywords });
    if (result) {
      setMessage(result);
      setSaving(false);
      return;
    }

    setSaved(true);
    setSaving(false);
    setMessage("Profile saved.");
  };

  const inputClass = "w-full rounded-md border border-border bg-secondary px-3 py-2.5 text-sm font-body text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary";

  return (
    <div className="rounded-lg border border-border bg-card p-6">
      <div className="mb-4 flex items-center gap-2">
        <User className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-mono font-semibold uppercase tracking-wider text-foreground">Identity Profile</h3>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="mb-1 block text-xs font-mono text-muted-foreground">Display Name</label>
          <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} required className={inputClass} placeholder="John Doe" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-mono text-muted-foreground">Username / Handle</label>
          <input value={username} onChange={(e) => setUsername(e.target.value)} required className={inputClass} placeholder="@johndoe" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-mono text-muted-foreground">Social Media Link</label>
          <input value={socialLink} onChange={(e) => setSocialLink(e.target.value)} className={inputClass} placeholder="https://twitter.com/johndoe" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-mono text-muted-foreground">Keywords</label>
          <input value={keywords} onChange={(e) => setKeywords(e.target.value)} className={inputClass} placeholder="developer, photographer" />
        </div>
        <button type="submit" disabled={saving} className="w-full rounded-md bg-primary px-4 py-2.5 text-sm font-mono font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50">
          {saving ? "Saving..." : saved ? "Update Profile" : "Save Profile"}
        </button>
        {message && <p className="text-xs font-body text-muted-foreground">{message}</p>}
      </form>
    </div>
  );
};

export default IdentityForm;
