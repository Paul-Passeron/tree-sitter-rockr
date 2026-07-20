; ── Keywords ────────────────────────────────────────────────────────────────

[
  "fun"
  "return"
  "let"
  "mod"
  "struct"
  "enum"
  "impl"
  "interface"
  "for"
  "while"
  "if"
  "else"
  "in"
  "type"
  "match"
  "break"
  "defer"
  "as"
] @keyword

; ── Include directive ────────────────────────────────────────────────────────

"@include" @keyword.import
"@extern" @keyword

; ── Built-in operators / special syntax ─────────────────────────────────────

"@sizeof" @function.builtin

; ── Boolean literals ─────────────────────────────────────────────────────────

(bool_lit) @boolean

; ── Number literals ──────────────────────────────────────────────────────────

(int_lit) @number

; ── String / char literals ───────────────────────────────────────────────────

(str_lit) @string
(cstr_lit) @string
(char_lit) @character
(escape_sequence) @escape

; ── Comments ─────────────────────────────────────────────────────────────────

(line_comment) @comment
(block_comment) @comment

; ── Function definitions ─────────────────────────────────────────────────────

(fun_def name: (identifier) @function)
(method_sig name: (identifier) @function)
(method_def name: (identifier) @function.method)

; ── Function / method calls ──────────────────────────────────────────────────

(call_expr callee: (identifier) @function.call)
(method_call_expr method: (identifier) @function.method)
(static_call_expr method: (identifier) @function.method)

; ── Type names ───────────────────────────────────────────────────────────────

(named_type (identifier) @type)
(pointer_type "*" @operator (identifier) @type)

; ── Struct definition ────────────────────────────────────────────────────────

(struct_def name: (identifier) @type)
(struct_field name: (identifier) @property)
(enum_def name: (identifier) @type)
(enum_variant name: (identifier) @constructor)

; ── Struct literal ───────────────────────────────────────────────────────────

(struct_lit_field name: (identifier) @property)

; ── Impl blocks ──────────────────────────────────────────────────────────────

(impl_block "for" @keyword)

; ── Interface ────────────────────────────────────────────────────────────────

(interface_decl name: (identifier) @type)

; ── Module ───────────────────────────────────────────────────────────────────

(module_decl name: (identifier) @namespace)

; ── Template parameters ──────────────────────────────────────────────────────

(template_param name: (identifier) @type.parameter)

; ── Function parameters ──────────────────────────────────────────────────────

(fun_param name: (identifier) @variable.parameter)

; ── Method receiver ──────────────────────────────────────────────────────────

(receiver "self" @variable.builtin)

; ── Field access ─────────────────────────────────────────────────────────────

(field_access_expr field: (identifier) @property)

; ── Let patterns ─────────────────────────────────────────────────────────────

(let_decl pat: (identifier) @variable)

; ── Operators ────────────────────────────────────────────────────────────────

[
  "+"  "-"  "*"  "/"  "%"
  "==" "!=" "<"  "<=" ">"  ">="
  "&&" "||"
  "&"  "|"  "^"
  "!"  ".."
  "+=" "-=" "*=" "/=" "%="
  "="  "=>"
  "::"
  "@"  "$"
] @operator

; ── Punctuation ──────────────────────────────────────────────────────────────

["(" ")" "[" "]" "{" "}"] @punctuation.bracket
["," ";" ":"]             @punctuation.delimiter

; ── Wildcards / inferred ─────────────────────────────────────────────────────

(wildcard_pattern) @constant.builtin
(inferred_type)    @type.builtin

; ── Include path identifiers ─────────────────────────────────────────────────

(include_decl path: (identifier) @namespace)

; ── Generic identifiers (fallback) ───────────────────────────────────────────

(identifier) @variable
