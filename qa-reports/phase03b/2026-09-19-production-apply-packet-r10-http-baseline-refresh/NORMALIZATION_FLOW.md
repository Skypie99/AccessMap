# R10 normalization and validation flow

`parseCliJson` -> exact transport container -> exactly one row -> exact row key set -> extract snapshot -> add the trusted `querySucceeded` discriminator -> exact snapshot schema -> nested-object schema -> semantic identity -> discriminator consistency -> contradiction checks -> `VALIDATED_R10` -> entry classifier -> optional comparator -> apply classifier -> policy -> final envelope validation.

Invalid snapshots throw `FAIL_CLOSED_INVALID_ENVELOPE`. The 16-case R10 regression records zero classifier calls, zero comparator calls, zero consumed classification results, and zero controller transitions across every invalid-snapshot case.
