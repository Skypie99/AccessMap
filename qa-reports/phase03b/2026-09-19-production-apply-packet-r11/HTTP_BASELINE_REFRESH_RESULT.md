# R10 HTTP baseline history retained by R11

R10's owner-accepted six-row fingerprint and the later three-row fingerprint are retained without alteration in the R11 evidence set. Their differing values demonstrate why retained response history is volatile under pg_net TTL.

R11 classifies every historical response count and fingerprint as `DIAGNOSTIC_HISTORY_ONLY`. No historical value authorizes or blocks cutover. The replacement safety gate uses immutable database T0, TTL greater than 600 seconds, queue zero, and zero response rows created at or after T0.
