# Spofiywebs Creative Studio

Website prompt: spofiywebs

Build a one-person creative studio/portfolio website called spofiywebs for a designer who makes posters, hand-drawn logos, and websites. Style: dark, moody, black-and-white, minimal—black background (#0a0a0a), off-white text, one electric-indigo accent color, "Space Grotesk" for headings and "Inter" for body text.

Structure (5 sections, single scrolling page with anchor nav):

Home—full-screen hero with a looping, muted, grayscale background video. Headline: "I want to make your [rotating word: posters / logos / websites] unforgettable." Two buttons: "View the work" and "Start a project."

Work—a grid of portfolio pieces (posters, logos, and website mockups), each as a card with an image, a title, a category, and a download button so visitors can save the artwork. Links out to the studio's Instagram for the full archive.

Services—three cards: Poster Design, Logo Design, and Website Design, each with a one-line pitch.

About—a short bio paragraph plus a contact box with Instagram handle and email.

Contact—a message form (name/email/message) that stores messages for the owner to read and reply to, plus a direct "Email instead" mailto button as a fallback. Visitors who submit a message can see the studio's reply if they return to the same browser.

Admin (owner-only, hidden from regular visitors):

Edit the homepage's rotating headline words and the About bio.

Add new portfolio pieces by uploading an image with a title and category.

Read and reply to visitor messages from the Contact form.

Integrations: Instagram profile link in the nav and footer; a real email address for direct contact; the owner's own uploaded video as the hero background, converted to a small, web-friendly file size. Portfolio images—Instagram blocks automated access, so I couldn't pull your actual posts. I filled the work grid with placeholder cards. You (as the artifact owner) will see an Admin button in the nav—open it and use the Portfolio tab to upload your real images; they'll replace the placeholders for everyone who visits.
Admin panel—only visible to you (the owner), with three tabs: edit hero words/bio (Content), add work with image upload (Portfolio), and read/reply to inquiries (Messages).
Contact form → your Gmail—a static site genuinely can't auto-send email to spofiywebs37@gmail.com; there's no server to do that from. What I built instead: messages get saved and show up in your Admin → Messages tab, plus an "Email instead" button that opens a pre-addressed mailto: to your Gmail directly. If you want true auto-forwarding to Gmail, that needs a form service (like Formspree) connected with your own account—happy to wire that in if you set one up.
The Instagram link points to instagram.com/spofiywebs (I dropped the share-sheet tracking params; they're not needed for a normal link). " A monstrous, muscular humanoid titan figure standing in a dramatic power pose, arms raised and flexed. Cracked, armor-like plating covers the torso and limbs like weathered stone or obsidian. Gaunt, sunken, intense eyes and pale, windswept hair partially covering the face. Wisps of steam and smoke rising from the shoulders and background. Rendered in high-contrast black-and-white pencil sketch style with heavy cross-hatching and rough, energetic linework—the same raw, unfinished sketchbook feel as your other pieces."

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
