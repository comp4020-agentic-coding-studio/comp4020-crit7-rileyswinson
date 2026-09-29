# Process overview

## What I built

I re-made the ANU extension form. The remake is largley AI generated, but I believe that idea to:
have one location that automatically considers EAPs
allow for short extensions
clearly communicates the expectations and requirements of students (including what should or should not be asked of them)
and including - within the same portal - each course and application that each course staff gets
is a sound principle, and this demonstrates the idea successfully.

## How I got here

Created a thorough plain-text description of what I wanted, including ANU colors and some specific policy, followed by some amount of testing between devices to ensure it's presistent, and minor iterative improvements. The goal was a demonstration of the concept; I cannot make a fully functioning veresion without access to ANU SSO logins, access to ANU internal systems, convenor and class lists, etc; so I just had a garbage plain-text username-only login system.

The whole build is [`a1c8026...784d600`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit7-rileyswinson/compare/a1c8026...784d600): the database schema first ([`8e8f49c`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit7-rileyswinson/commit/8e8f49c)), then login and the homepage ([`f332988`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit7-rileyswinson/commit/f332988)), the course pages ([`578eb55`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit7-rileyswinson/commit/578eb55)), and the three request forms plus the CENTRAL queue ([`36bae89`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit7-rileyswinson/commit/36bae89)). The tests that check the core flow persists across a reload are in [`887588b`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit7-rileyswinson/commit/887588b). The iterative round after testing the first version, which added Accept/Consider/Deny with required responses, appeals, and the split between centrally run and course-run exams, is [`fe9d4ee`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit7-rileyswinson/commit/fe9d4ee).

The account of the process: how the work actually went, and how you knew the
result was right. Tell it in whatever order makes it clear. A weekly prototype
needs a paragraph or two; an assignment needs more.
