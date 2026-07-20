/// <reference types="tree-sitter-cli/dsl" />
// @ts-check

module.exports = grammar({
  name: "rockr",

  extras: ($) => [/\s/, $.line_comment, $.block_comment],

  conflicts: ($) => [
    [$.named_type, $.named_type],
    [$.paren_expr, $.tuple_type],
  ],

  word: ($) => $.identifier,

  rules: {
    // ─── Top level ──────────────────────────────────────────────────────────
    source_file: ($) =>
      repeat(choice($.include_decl, $._top_level_item)),

    include_decl: ($) =>
      seq("@include", field("path", $._include_path)),

    _include_path: ($) =>
      choice($.identifier, seq($.identifier, "::", $._include_path)),

    _top_level_item: ($) =>
      choice(
        $.module_decl,
        $.fun_def,
        $.interface_decl,
        $.impl_block,
        $.struct_def,
        $.enum_def,
        $.extern_block,
      ),

    // ─── Annotations ────────────────────────────────────────────────────────
    // `@[Flag, Call(T, U)]` — prefixes top-level items and impl items.
    annotation: ($) => seq("@", "[", commaSep($.annotation_item), "]"),

    annotation_item: ($) =>
      choice(
        seq(field("name", $.identifier), "(", commaSep($._type_expr), ")"),
        field("name", $.identifier),
      ),

    // ─── Module ─────────────────────────────────────────────────────────────
    module_decl: ($) =>
      seq(
        field("annotations", repeat($.annotation)),
        "mod",
        field("name", $.identifier),
        "{",
        repeat($._top_level_item),
        "}",
      ),

    // ─── Struct ─────────────────────────────────────────────────────────────
    struct_def: ($) =>
      seq(
        field("annotations", repeat($.annotation)),
        "struct",
        field("name", $.identifier),
        optional($._template_params),
        "{",
        repeat($.struct_field),
        "}",
      ),

    struct_field: ($) =>
      seq(
        field("name", $.identifier),
        ":",
        field("ty", $._type_expr),
        ";",
      ),

    // ─── Enum ───────────────────────────────────────────────────────────────
    enum_def: ($) =>
      seq(
        field("annotations", repeat($.annotation)),
        "enum",
        field("name", $.identifier),
        optional($._template_params),
        "{",
        commaSep($.enum_variant),
        "}",
      ),

    enum_variant: ($) =>
      seq(
        field("name", $.identifier),
        optional(
          choice(
            seq("(", commaSep($._type_expr), ")"),
            seq("{", repeat($.struct_field), "}"),
          ),
        ),
      ),

    // ─── Function (top level, no receiver) ─────────────────────────────────
    fun_def: ($) =>
      seq(
        field("annotations", repeat($.annotation)),
        "fun",
        field("name", $.identifier),
        optional($._template_params),
        "(",
        field("params", commaSep($.fun_param)),
        ")",
        ":",
        field("return_type", $._type_expr),
        field("body", $.block),
      ),

    fun_param: ($) =>
      seq(
        field("name", $.identifier),
        ":",
        field("ty", $._type_expr),
      ),

    // ─── Method receiver (self / &self / &mut self / *self / *mut self) ───
    receiver: ($) =>
      choice(
        "self",
        seq("mut", "self"),
        seq("&", "self"),
        seq("&", "mut", "self"),
        seq("*", "self"),
        seq("*", "mut", "self"),
      ),

    method_params: ($) =>
      choice(
        seq(
          field("receiver", $.receiver),
          optional(seq(",", commaSep1($.fun_param))),
        ),
        commaSep1($.fun_param),
      ),

    // ─── Method signature (interface items — no body) ──────────────────────
    method_sig: ($) =>
      seq(
        "fun",
        field("name", $.identifier),
        optional($._template_params),
        "(",
        optional(field("params", $.method_params)),
        ")",
        ":",
        field("return_type", $._type_expr),
        ";",
      ),

    // ─── Method definition (impl items — has body + receiver) ──────────────
    method_def: ($) =>
      seq(
        field("annotations", repeat($.annotation)),
        "fun",
        field("name", $.identifier),
        optional($._template_params),
        "(",
        field("params", $.method_params),
        ")",
        ":",
        field("return_type", $._type_expr),
        field("body", $.block),
      ),

    _template_params: ($) =>
      seq("<", commaSep1($.template_param), ">"),

    template_param: ($) =>
      seq(
        field("name", $.identifier),
        optional(seq(":", colonSep1($._type_expr))),
      ),

    // ─── Interface ──────────────────────────────────────────────────────────
    interface_decl: ($) =>
      seq(
        field("annotations", repeat($.annotation)),
        "interface",
        field("name", $.identifier),
        optional($._template_params),
        optional(seq(":", field("supers", $.supertrait_list))),
        "{",
        repeat($._interface_item),
        "}",
      ),

    supertrait_list: ($) => seq($._type_expr, repeat(seq("+", $._type_expr))),

    _interface_item: ($) => choice($.interface_type_item, $.method_sig),

    interface_type_item: ($) =>
      seq(
        "type",
        field("name", $.identifier),
        optional(seq(":", colonSep1($._type_expr))),
        ";",
      ),

    // ─── Impl ───────────────────────────────────────────────────────────────
    impl_block: ($) =>
      seq(
        field("annotations", repeat($.annotation)),
        "impl",
        optional($._template_params),
        optional(seq(field("interface", $._type_expr), "for")),
        field("implemented", $._type_expr),
        "{",
        repeat($._impl_item),
        "}",
      ),

    _impl_item: ($) => choice($.impl_type_item, $.method_def),

    impl_type_item: ($) =>
      seq(
        field("annotations", repeat($.annotation)),
        "type",
        field("name", $.identifier),
        "=",
        field("ty", $._type_expr),
        ";",
      ),

    // ─── Extern block ───────────────────────────────────────────────────────
    // `@extern { fun name(args [+]): ty; }` — no receiver, may be variadic.
    extern_block: ($) =>
      seq(
        "@extern",
        "{",
        field("annotations", repeat($.annotation)),
        "fun",
        field("name", $.identifier),
        optional($._template_params),
        "(",
        field("params", commaSep($.fun_param)),
        field("variadic", optional("+")),
        ")",
        ":",
        field("return_type", $._type_expr),
        ";",
        "}",
      ),

    // ─── Statements ─────────────────────────────────────────────────────────
    block: ($) => seq("{", repeat($._stmt), "}"),

    _stmt: ($) =>
      choice(
        $.return_stmt,
        $.if_stmt,
        $.while_stmt,
        $.for_stmt,
        $.match_stmt,
        $.let_decl,
        $.block,
        $.break_stmt,
        $.defer_stmt,
        $.assign_stmt,
        $.compound_assign_stmt,
        $.expr_stmt,
      ),

    return_stmt: ($) => seq("return", optional($._expr), ";"),

    if_stmt: ($) =>
      seq(
        "if",
        field("cond", $._expr),
        field("then", $.block),
        optional(seq("else", field("else", $.block))),
      ),

    while_stmt: ($) =>
      seq("while", field("cond", $._expr), field("body", $.block)),

    for_stmt: ($) =>
      seq(
        "for",
        field("element", $._pattern),
        "in",
        field("iterator", $._expr),
        field("body", $.block),
      ),

    match_stmt: ($) =>
      seq(
        "match",
        field("scrutinee", $._expr),
        "{",
        repeat($.match_branch),
        "}",
      ),

    match_branch: ($) =>
      seq(
        field("pat", $._pattern),
        optional(seq("if", field("guard", $._expr))),
        "=>",
        field("body", $.block),
      ),

    break_stmt: ($) => seq("break", ";"),

    defer_stmt: ($) => seq("defer", field("stmt", $._stmt)),

    let_decl: ($) =>
      seq(
        "let",
        field("pat", $._pattern),
        optional(seq(":", field("ty", $._any_type_expr))),
        "=",
        field("value", $._expr),
        ";",
      ),

    assign_stmt: ($) =>
      seq(field("lhs", $._expr), "=", field("rhs", $._expr), ";"),

    compound_assign_stmt: ($) =>
      seq(
        field("lhs", $._expr),
        field("op", $.compound_assign_op),
        field("rhs", $._expr),
        ";",
      ),

    compound_assign_op: ($) => choice("+=", "-=", "*=", "/=", "%="),

    expr_stmt: ($) => seq($._expr, ";"),

    // ─── Expressions ────────────────────────────────────────────────────────
    _expr: ($) =>
      choice(
        $.binary_expr,
        $.cast_expr,
        $.unary_expr,
        $.postfix_expr,
        $.call_expr,
        $.method_call_expr,
        $.static_call_expr,
        $.index_expr,
        $.field_access_expr,
        $.tuple_access_expr,
        $.struct_lit,
        $.range_expr,
        $.name_resolved_expr,
        $.paren_expr,
        $.sizeof_expr,
        $.identifier,
        $.int_lit,
        $.char_lit,
        $.str_lit,
        $.cstr_lit,
        $.bool_lit,
      ),

    binary_expr: ($) =>
      choice(
        prec.left(
          10,
          seq($._expr, field("op", choice("+", "-")), $._expr),
        ),
        prec.left(
          11,
          seq($._expr, field("op", choice("*", "/", "%")), $._expr),
        ),
        prec.left(
          1,
          seq($._expr, field("op", choice("==", "!=")), $._expr),
        ),
        prec.left(
          1,
          seq(
            $._expr,
            field("op", choice("<", "<=", ">", ">=")),
            $._expr,
          ),
        ),
        prec.left(3, seq($._expr, field("op", "&&"), $._expr)),
        prec.left(2, seq($._expr, field("op", "||"), $._expr)),
        prec.left(7, seq($._expr, field("op", "&"), $._expr)),
        prec.left(6, seq($._expr, field("op", "|"), $._expr)),
        prec.left(6, seq($._expr, field("op", "^"), $._expr)),
      ),

    cast_expr: ($) =>
      prec.left(
        12,
        seq(field("expr", $._expr), "as", field("ty", $._type_expr)),
      ),

    range_expr: ($) =>
      prec.left(
        4,
        seq(field("from", $._expr), "..", field("to", $._expr)),
      ),

    unary_expr: ($) =>
      prec(
        15,
        choice(
          seq("&", optional("mut"), $._expr),
          seq("-", $._expr),
          seq("!", $._expr),
          seq("*", $._expr),
        ),
      ),

    // Postfix `@` (address-of) and `$` (deref).
    postfix_expr: ($) =>
      prec(20, choice(seq($._expr, "$"), seq($._expr, "@"))),

    turbofish: ($) => seq("::", "<", commaSep1($._any_type_expr), ">"),

    call_expr: ($) =>
      prec(
        20,
        seq(
          field("callee", $._expr),
          optional(field("type_args", $.turbofish)),
          "(",
          field("args", commaSep($._expr)),
          ")",
        ),
      ),

    // prec(21): one above field_access_expr so '(' resolves to method call
    method_call_expr: ($) =>
      prec(
        21,
        seq(
          field("object", $._expr),
          ".",
          field("method", $.identifier),
          optional(field("type_args", $.turbofish)),
          "(",
          field("args", commaSep($._expr)),
          ")",
        ),
      ),

    static_call_expr: ($) =>
      prec(
        21,
        seq(
          field("ty", $.named_type),
          "::",
          field("method", $.identifier),
          "(",
          field("args", commaSep($._expr)),
          ")",
        ),
      ),

    index_expr: ($) =>
      prec(
        20,
        seq(
          field("object", $._expr),
          "[",
          field("index", $._expr),
          "]",
        ),
      ),

    field_access_expr: ($) =>
      prec(
        20,
        seq(
          field("object", $._expr),
          ".",
          field("field", $.identifier),
        ),
      ),

    tuple_access_expr: ($) =>
      prec(
        20,
        seq(
          field("object", $._expr),
          ".",
          field("index", $.int_lit),
        ),
      ),

    name_resolved_expr: ($) =>
      prec.right(1, seq($.identifier, "::", $._expr)),

    paren_expr: ($) => seq("(", commaSep($._expr), ")"),

    sizeof_expr: ($) => seq("@sizeof", "(", $._type_expr, ")"),

    struct_lit: ($) =>
      prec(
        3,
        seq(
          field("ty", $._type_expr),
          "{",
          commaSep($.struct_lit_field),
          "}",
        ),
      ),

    struct_lit_field: ($) =>
      seq(
        ".",
        field("name", $.identifier),
        ":",
        field("value", $._expr),
      ),

    // ─── Types ──────────────────────────────────────────────────────────────
    _type_expr: ($) =>
      choice($.named_type, $.ref_type, $.pointer_type, $.tuple_type, $.slice_type),

    _any_type_expr: ($) => choice($._type_expr, $.inferred_type),

    named_type: ($) =>
      prec(
        2,
        choice(
          seq($.identifier, "<", commaSep1($._any_type_expr), ">"),
          seq($.identifier, "::", $._type_expr),
          $.identifier,
        ),
      ),

    // `&T`, `&mut T`, `&&T` (the lexer emits `&&` as one token, same as `&&`
    // in expressions — used here for a double reference).
    ref_type: ($) =>
      prec.right(
        seq(choice("&", "&&"), optional("mut"), field("pointee", $._any_type_expr)),
      ),

    pointer_type: ($) =>
      prec.right(seq("*", optional("mut"), field("pointee", $._any_type_expr))),

    tuple_type: ($) => seq("(", commaSep($._any_type_expr), ")"),

    slice_type: ($) =>
      seq(
        "[",
        field("ty", $._any_type_expr),
        optional(seq(";", field("len", $.int_lit))),
        "]",
      ),

    inferred_type: ($) => token("_"),

    // ─── Patterns ───────────────────────────────────────────────────────────
    _pattern: ($) =>
      choice(
        $.wildcard_pattern,
        $.mut_pattern,
        $.constructor_pattern,
        $.tuple_pattern,
        $.name_resolved_pattern,
        $.identifier,
        $.int_lit,
      ),

    wildcard_pattern: ($) => "_",

    mut_pattern: ($) => seq("mut", field("name", $.identifier)),

    constructor_pattern: ($) =>
      seq(
        field("name", $.identifier),
        choice(
          seq("(", commaSep($._pattern), ")"),
          seq("{", commaSep($.struct_field_pattern), "}"),
        ),
      ),

    struct_field_pattern: ($) =>
      choice(
        seq(field("name", $.identifier), ":", field("pattern", $._pattern)),
        field("name", $.identifier),
      ),

    tuple_pattern: ($) => seq("(", commaSep($._pattern), ")"),

    name_resolved_pattern: ($) => seq($.identifier, "::", $._pattern),

    // ─── Primitives ─────────────────────────────────────────────────────────
    identifier: ($) => /[a-zA-Z_][a-zA-Z0-9_]*/,

    int_lit: ($) => /[0-9]+/,

    char_lit: ($) =>
      seq("'", choice(/[^'\\]/, $.escape_sequence), "'"),

    str_lit: ($) =>
      seq('"', repeat(choice(/[^"\\]+/, $.escape_sequence)), '"'),

    cstr_lit: ($) =>
      seq('c"', repeat(choice(/[^"\\]+/, $.escape_sequence)), '"'),

    escape_sequence: ($) =>
      token(
        seq(
          "\\",
          choice(
            "n",
            "t",
            "r",
            "\\",
            '"',
            "'",
            "0",
            /x[0-9a-fA-F]{2}/,
          ),
        ),
      ),

    bool_lit: ($) => choice("true", "false"),

    // ─── Comments ───────────────────────────────────────────────────────────
    line_comment: ($) => token(seq("//", /.*/)),

    block_comment: ($) =>
      token(seq("/*", /[^*]*\*+([^/*][^*]*\*+)*/, "/")),
  },
});

/**
 * @param {RuleOrLiteral} rule
 */
function commaSep(rule) {
  return optional(commaSep1(rule));
}

/**
 * @param {RuleOrLiteral} rule
 */
function commaSep1(rule) {
  return seq(rule, repeat(seq(",", rule)), optional(","));
}

/**
 * @param {RuleOrLiteral} rule
 */
function colonSep1(rule) {
  return seq(rule, repeat(seq("+", rule)));
}
