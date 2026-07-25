// Config plugin: unblock local iOS Release builds under Xcode 26.6.
//
// Xcode 26.6's clang rejects fmt 11.0.2's consteval format-string checking —
// five "call to consteval function 'fmt::basic_format_string<...>' is not a
// constant expression" errors in fmt/format-inl.h (lines 59/60/1387/1391/1394),
// all `fmt::format_to(it, FMT_STRING(...))` calls. That header is compiled into
// exactly one translation unit: the fmt pod's src/format.cc (RN 0.81 pins
// fmt 11.0.2 via third-party-podspecs/fmt.podspec).
//
// fmt 11.0.2 has no external macro off-switch (base.h:113-139 unconditionally
// redefines FMT_USE_CONSTEVAL / FMT_CONSTEVAL, so -D defines lose), but its own
// version ladder disables consteval entirely below C++20 (base.h:116-117) — a
// configuration fmt supports on every clang. So: compile the fmt pod at
// gnu++17. Runtime formatting behavior is identical; only fmt-internal
// compile-time format-string checking is skipped, and those strings are static
// literals that already parse. Every other pod stays at C++20, untouched.
//
// The snippet is injected AFTER react_native_post_install(...). Belt-and-braces:
// RN's NewArchitectureHelper.set_clang_cxx_language_standard_if_needed writes to
// the *user* project's configs (react_native_pods.rb:515 ->
// new_architecture.rb:16-30 iterates installer.aggregate_targets.map(&:user_project)),
// not to Pods targets, so it cannot re-stomp this regardless of ordering.
//
// EAS parity: ios/ is untracked (.gitignore -> /ios), so EAS runs expo prebuild
// on a clean worker from this same app.json + plugin. Cloud and local therefore
// generate a byte-identical Podfile and EAS compiles fmt at C++17 too — this is
// NOT a local-only override. That is the safe outcome, not a risk: fmt 11.0.2
// supports C++11 and up, and the only thing given up is fmt's compile-time
// validation of its own four static format literals ("{}{}", "{:x}", "{:08x}",
// "p{}"). Runtime formatting behavior and output bytes are unchanged.
//
// Remove this plugin when Expo/React Native ships an fmt newer than 11.0.2
// with the upstream consteval fix.
const { withPodfile } = require('@expo/config-plugins');

const MARKER = 'AccessMap fmt/Xcode-26 consteval fix';

const SNIPPET = `
    # ${MARKER} — injected by plugins/withFmtXcode26Fix.js; do not edit here.
    # Compile the fmt pod (src/format.cc only) at C++17 so fmt's own version
    # ladder (base.h:113-139) turns consteval off — Xcode 26.6's clang rejects
    # fmt 11.0.2's consteval format-string checks. Identical runtime behavior.
    # Applies on EAS too (ios/ is CNG — prebuilt from this plugin on the worker);
    # safe there because C++17 is a supported fmt configuration.
    installer.pods_project.targets.each do |target|
      next unless target.name == 'fmt'
      target.build_configurations.each do |config|
        config.build_settings['CLANG_CXX_LANGUAGE_STANDARD'] = 'gnu++17'
      end
    end
`;

// Matches the react_native_post_install(...) call through its closing paren,
// which sits alone on its own line in the Expo template's post_install block.
const ANCHOR = /react_native_post_install\([\s\S]*?\n\s*\)\n/;

function withFmtXcode26Fix(config) {
  return withPodfile(config, (config) => {
    const contents = config.modResults.contents;
    if (contents.includes(MARKER)) return config;
    const match = contents.match(ANCHOR);
    if (!match) {
      throw new Error(
        'withFmtXcode26Fix: react_native_post_install(...) not found in the ' +
          'generated Podfile — the Expo template changed. Update the anchor in ' +
          'plugins/withFmtXcode26Fix.js (or delete the plugin if fmt > 11.0.2 ' +
          'builds cleanly under current Xcode).'
      );
    }
    config.modResults.contents = contents.replace(ANCHOR, match[0] + SNIPPET);
    return config;
  });
}

module.exports = withFmtXcode26Fix;
