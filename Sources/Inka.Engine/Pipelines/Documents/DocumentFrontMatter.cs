// MIT License
//
// Copyright (c) 2022 Serhii Kokhan
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in all
// copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.

using Carcass.Core;

namespace Inka.Engine.Pipelines.Documents;

public sealed class DocumentFrontMatter
{
    public string? Title { get; set; }
    public string? CreatedAt { get; set; }
    public bool IsDraft { get; set; }
    public List<string> Tags { get; set; } = new();
    public string? XRef { get; set; }
    public string? Brief { get; set; }
    public string? BriefLogo { get; set; }
    public Dictionary<string, string> Metadata { get; set; } = new();

    public void Validate()
    {
        ArgumentVerifier.NotNull(Title, nameof(Title));
        ArgumentVerifier.NotNull(CreatedAt, nameof(CreatedAt));
        ArgumentVerifier.NotNull(Tags, nameof(Tags));
        ArgumentVerifier.NotNull(Metadata, nameof(Metadata));
    }
}